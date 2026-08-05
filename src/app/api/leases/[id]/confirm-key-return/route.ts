import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

// POST /api/leases/[id]/confirm-key-return
// OWNER only. Records actual move-out date, starts the legal deposit return clock.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  const isManager = user && ["OWNER", "SUPERADMIN", "ADMIN", "PROPERTY_MANAGER"].includes(user.role);

  if (!session?.user || !isManager) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id: leaseId } = await params;

  let bodyActualDate: string | undefined;
  try {
    const body = await req.json();
    bodyActualDate = body?.actualMoveOutDate;
  } catch {
    // Empty body is acceptable
  }

  try {
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: { tenant: true, unit: { include: { property: true } } },
    });

    if (!lease || (user.role === "OWNER" && lease.unit.property.ownerId !== user.id)) {
      return NextResponse.json({ error: "Lease not found or access denied" }, { status: 404 });
    }

    if (lease.moveOutStatus === "NONE" || lease.status === "TERMINATED") {
      return NextResponse.json({ error: "No active move-out request found for this lease." }, { status: 400 });
    }

    // Determine actual move-out date
    const moveOutDateObj = bodyActualDate
      ? new Date(bodyActualDate)
      : lease.moveOutDate
      ? new Date(lease.moveOutDate)
      : new Date();

    const depositReturnDays = lease.depositReturnDays || 21;

    // Compute the legal deposit return deadline
    const depositDueBy = new Date(moveOutDateObj);
    depositDueBy.setDate(depositDueBy.getDate() + depositReturnDays);

    // Only update moveOutStatus if it is currently in early phase
    const shouldUpdateStatus = ["MOVE_OUT_REQUESTED", "INSPECTION_SCHEDULED"].includes(lease.moveOutStatus);
    const newMoveOutStatus = shouldUpdateStatus ? "KEYS_RETURNED" : lease.moveOutStatus;

    const updatedLease = await prisma.lease.update({
      where: { id: leaseId },
      data: {
        actualMoveOutDate: moveOutDateObj,
        keyReturnConfirmedAt: new Date(),
        depositDueBy,
        moveOutStatus: newMoveOutStatus,
      },
    });

    // Notify tenant — the deposit clock has started
    if (lease.tenantId) {
      await notify({
        userId: lease.tenantId,
        title: "Key Return Confirmed",
        message: `Your key return for ${lease.unit?.property?.name} — ${lease.unit?.name} has been confirmed. Your move-out date is recorded as ${moveOutDateObj.toLocaleDateString()}. You can expect your deposit disposition within ${depositReturnDays} days (by ${depositDueBy.toLocaleDateString()}).`,
        type: "LEASE",
        priority: "HIGH",
        relatedEntityId: lease.id,
      });
    }

    return NextResponse.json(updatedLease);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to confirm key return" }, { status: 500 });
  }
}
