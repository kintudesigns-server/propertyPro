import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

// POST /api/leases/[id]/confirm-key-return
// OWNER only. Records actual move-out date, starts the legal deposit return clock.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id: leaseId } = await params;
  const { actualMoveOutDate } = await req.json();

  if (!actualMoveOutDate) {
    return NextResponse.json({ error: "Actual move-out date is required." }, { status: 400 });
  }

  try {
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: { tenant: true, unit: { include: { property: true } } },
    });

    if (!lease || lease.unit.property.ownerId !== (session.user as any).id) {
      return NextResponse.json({ error: "Lease not found or access denied" }, { status: 404 });
    }

    if (lease.moveOutStatus !== "MOVE_OUT_REQUESTED") {
      return NextResponse.json({ error: "Key return can only be confirmed after a move-out notice has been submitted." }, { status: 400 });
    }

    const moveOutDateObj = new Date(actualMoveOutDate);
    const depositReturnDays = lease.depositReturnDays || 21;

    // Compute the legal deposit return deadline
    const depositDueBy = new Date(moveOutDateObj);
    depositDueBy.setDate(depositDueBy.getDate() + depositReturnDays);

    const updatedLease = await prisma.lease.update({
      where: { id: leaseId },
      data: {
        actualMoveOutDate: moveOutDateObj,
        keyReturnConfirmedAt: new Date(),
        depositDueBy,
        moveOutStatus: "KEYS_RETURNED",
      },
    });

    // Notify tenant — the deposit clock has started
    await notify({
      userId: lease.tenantId,
      title: "Key Return Confirmed",
      message: `Your key return for ${lease.unit?.property?.name} — ${lease.unit?.name} has been confirmed. Your move-out date is recorded as ${moveOutDateObj.toLocaleDateString()}. You can expect your deposit disposition within ${depositReturnDays} days (by ${depositDueBy.toLocaleDateString()}).`,
      type: "LEASE",
      priority: "HIGH",
      relatedEntityId: lease.id,
    });

    return NextResponse.json(updatedLease);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to confirm key return" }, { status: 500 });
  }
}
