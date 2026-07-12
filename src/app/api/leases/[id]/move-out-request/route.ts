import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "TENANT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id: leaseId } = await params;
  const { moveOutDate, moveOutReason, forwardingAddress } = await req.json();

  try {
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: { unit: { include: { property: true } } },
    });

    if (!lease) {
      return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    }

    if (lease.tenantId !== (session.user as any).id) {
      return NextResponse.json({ error: "Forbidden: Not your lease" }, { status: 403 });
    }

    if (lease.status !== "ACTIVE") {
      return NextResponse.json({ error: "Only ACTIVE leases can request move-out" }, { status: 400 });
    }

    if (!forwardingAddress) {
      return NextResponse.json({ error: "A forwarding address is legally required." }, { status: 400 });
    }

    // Calculate if it's a short notice (for potential penalty tracking later)
    const noticeDays = lease.moveOutNoticeDays || 30;
    const requestedDate = new Date(moveOutDate);
    const earliestAllowed = new Date();
    earliestAllowed.setDate(earliestAllowed.getDate() + noticeDays);
    earliestAllowed.setHours(0, 0, 0, 0);
    
    const isShortNotice = requestedDate < earliestAllowed;

    const updatedLease = await prisma.lease.update({
      where: { id: leaseId },
      data: {
        status: "NOTICE_GIVEN", // Important: Transition lease from ACTIVE to NOTICE_GIVEN
        moveOutStatus: "MOVE_OUT_REQUESTED",
        moveOutRequestDate: new Date(),
        moveOutDate: requestedDate,
        moveOutReason,
        forwardingAddress,
        isShortNotice
      },
    });

    // Automatically update the Unit status to NOTICE_GIVEN so the owner can begin marketing it
    await prisma.unit.update({
      where: { id: lease.unitId },
      data: { status: "NOTICE_GIVEN" }
    });

    // Notify owner of move-out request
    try {
      await notify({
        userId: (lease.unit as any).property.ownerId,
        title: "Move-Out Request Submitted",
        message: `Your tenant has requested to move out on ${requestedDate.toLocaleDateString()}. Reason: ${moveOutReason || "Not provided"}.`,
        type: "LEASE",
        priority: "HIGH",
        relatedEntityId: lease.id,
      });
    } catch (_) { /* non-fatal */ }

    return NextResponse.json(updatedLease, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to submit move-out request" }, { status: 500 });
  }
}
