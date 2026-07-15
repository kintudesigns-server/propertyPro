import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

// POST /api/leases/[id]/dispute-response
// OWNER only. Responds to a tenant's dispute of the deductions.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id: leaseId } = await params;
  const { notes } = await req.json();

  if (!notes || typeof notes !== "string" || notes.trim().length < 5) {
    return NextResponse.json({ error: "Please enter a valid response note (minimum 5 characters)." }, { status: 400 });
  }

  try {
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        tenant: true,
        unit: {
          include: {
            property: true
          }
        }
      },
    });

    if (!lease || lease.unit.property.ownerId !== (session.user as any).id) {
      return NextResponse.json({ error: "Lease not found or access denied" }, { status: 404 });
    }

    if (lease.moveOutStatus !== "TENANT_DISPUTED") {
      return NextResponse.json({ error: "Dispute response can only be submitted for disputed statements." }, { status: 400 });
    }

    const updatedLease = await prisma.lease.update({
      where: { id: leaseId },
      data: {
        moveOutStatus: "DISPUTE_FINALIZED",
        disputeResolutionNotes: notes,
        disputeResolvedAt: new Date(),
      },
    });

    // Notify tenant that dispute has been responded to and finalized
    await notify({
      userId: lease.tenantId,
      title: "Move-Out Dispute Responded To",
      message: `Your landlord has responded to your dispute for ${lease.unit?.property?.name}. Note: "${notes}". The dispute is finalized.`,
      type: "LEASE",
      priority: "HIGH",
      relatedEntityId: lease.id,
    });

    return NextResponse.json(updatedLease, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to respond to dispute" }, { status: 500 });
  }
}
