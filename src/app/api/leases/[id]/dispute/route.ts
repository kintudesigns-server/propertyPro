import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "TENANT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { note } = await req.json();
    if (!note) {
      return NextResponse.json({ error: "Dispute note is required" }, { status: 400 });
    }

    const { id: leaseId } = await params;
    const tenantId = (session.user as any).id;

    // Verify lease ownership
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: { unit: { include: { property: true } } },
    });

    if (!lease || lease.tenantId !== tenantId) {
      return NextResponse.json({ error: "Lease not found or access denied" }, { status: 404 });
    }

    // Only allow dispute if lease is terminated
    if (lease.status !== "TERMINATED" || lease.moveOutStatus !== "COMPLETED") {
      return NextResponse.json({ error: "Can only dispute finalized move-out statements" }, { status: 400 });
    }

    // Update lease with dispute note
    const updatedLease = await prisma.lease.update({
      where: { id: leaseId },
      data: {
        tenantDisputeNote: note,
        disputeCount: { increment: 1 },
      },
    });

    // Notify owner
    try {
      await notify({
        userId: lease.unit.property.ownerId,
        title: "Tenant Logged a Dispute",
        message: `Tenant for Unit ${lease.unit.name} has logged a formal dispute regarding the security deposit deductions.`,
        type: "LEASE",
        priority: "HIGH",
        relatedEntityId: lease.id,
      });
    } catch (err) {
      console.error("Failed to notify owner about dispute:", err);
    }

    return NextResponse.json(updatedLease);
  } catch (error: any) {
    console.error("Failed to process dispute:", error);
    return NextResponse.json({ error: error.message || "Failed to process dispute" }, { status: 500 });
  }
}
