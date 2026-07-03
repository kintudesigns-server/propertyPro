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
  if (!session?.user || (session.user as any).role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;

    // Verify lease exists and owner has access
    const lease = await prisma.lease.findUnique({
      where: { id },
      include: { unit: { include: { property: true } } },
    });

    if (!lease || lease.unit.property.ownerId !== (session.user as any).id) {
      return NextResponse.json({ error: "Lease not found or access denied" }, { status: 404 });
    }

    if (lease.status === "TERMINATED") {
      return NextResponse.json({ error: "Lease is already terminated" }, { status: 400 });
    }

    // Update lease status to TERMINATED and unit status to VACANT
    const [updatedLease] = await prisma.$transaction([
      prisma.lease.update({
        where: { id },
        data: { status: "TERMINATED" },
      }),
      prisma.unit.update({
        where: { id: lease.unitId },
        data: { status: "VACANT" },
      }),
    ]);

    // Create system notification for tenant
    try {
      await notify({
        userId: lease.tenantId,
        title: "Lease Agreement Terminated",
        message: `Your lease agreement for Unit ${lease.unit.name} at ${lease.unit.property.name} has been terminated by the property manager.`,
        type: "LEASE",
        priority: "HIGH",
        relatedEntityId: lease.id,
      });
    } catch (err) {
      console.error("Failed to send termination notification:", err);
    }

    return NextResponse.json(updatedLease);
  } catch (error: any) {
    console.error("Failed to terminate lease:", error);
    return NextResponse.json({ error: error.message || "Failed to terminate lease" }, { status: 500 });
  }
}
