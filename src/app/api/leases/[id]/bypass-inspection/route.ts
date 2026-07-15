import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

// POST /api/leases/[id]/bypass-inspection
// OWNER only. Bypasses the walkthrough inspection phase.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id: leaseId } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const { bypassReason, acknowledged } = body;

    if (!bypassReason || typeof bypassReason !== "string" || bypassReason.trim().length < 5) {
      return NextResponse.json({ error: "A valid reason of at least 5 characters is required to bypass the inspection." }, { status: 400 });
    }

    if (acknowledged !== true) {
      return NextResponse.json({ error: "You must acknowledge the legal implications of bypassing the inspection." }, { status: 400 });
    }

    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: { tenant: true, unit: { include: { property: true } } },
    });

    if (!lease || lease.unit.property.ownerId !== (session.user as any).id) {
      return NextResponse.json({ error: "Lease not found or access denied" }, { status: 404 });
    }

    // Only allow bypassing when in requested or scheduled state
    if (!["MOVE_OUT_REQUESTED", "INSPECTION_SCHEDULED"].includes(lease.moveOutStatus)) {
      return NextResponse.json({ error: "Walkthrough inspection cannot be bypassed at this stage." }, { status: 400 });
    }

    const updatedLease = await prisma.lease.update({
      where: { id: leaseId },
      data: {
        moveOutStatus: "INSPECTION_COMPLETED",
        inspectionDate: new Date(),
        inspectionNotes: `Walkthrough inspection bypassed by owner. Reason: ${bypassReason}`,
        moveOutBypassReason: bypassReason,
        moveOutBypassAcknowledgedAt: new Date(),
        deductions: [], // Empty deductions since walkthrough was bypassed
      },
    });

    // Notify tenant
    await notify({
      userId: lease.tenantId,
      title: "Walkthrough Inspection Bypassed",
      message: `The owner has bypassed the walkthrough inspection for your unit. The final disposition statement is now ready for your review.`,
      type: "LEASE",
      priority: "MEDIUM",
      relatedEntityId: lease.id,
    });

    return NextResponse.json(updatedLease, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to bypass inspection" }, { status: 500 });
  }
}
