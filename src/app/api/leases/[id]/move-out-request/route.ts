import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { encryptSymmetric } from "@/lib/encryption";

const ALLOWED_REFUND_METHODS = ["BANK_TRANSFER"];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "TENANT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id: leaseId } = await params;
  const {
    moveOutDate,
    moveOutReason,
    otherReasonNote,
    forwardingAddress,
    refundBankName,
    refundAccountName,
    refundAccountNumber,
    utilitiesAcknowledged,
    cleaningAcknowledged,
  } = await req.json();

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

    // Validate required fields
    if (!moveOutDate) {
      return NextResponse.json({ error: "Move-out date is required." }, { status: 400 });
    }
    if (!moveOutReason) {
      return NextResponse.json({ error: "Reason for moving is required." }, { status: 400 });
    }
    if (moveOutReason === "Other" && (!otherReasonNote || otherReasonNote.trim().length < 10)) {
      return NextResponse.json({ error: "Please describe your reason for moving (minimum 10 characters)." }, { status: 400 });
    }
    if (!forwardingAddress || forwardingAddress.trim().length < 10) {
      return NextResponse.json({ error: "A valid forwarding address is required for your disposition letter." }, { status: 400 });
    }
    
    if (!refundBankName || !refundAccountName || !refundAccountNumber) {
      return NextResponse.json({ error: "Bank details are required for deposit refund." }, { status: 400 });
    }

    // Calculate short-notice
    const noticeDays = lease.moveOutNoticeDays || 30;
    const requestedDate = new Date(moveOutDate);
    const earliestAllowed = new Date();
    earliestAllowed.setDate(earliestAllowed.getDate() + noticeDays);
    earliestAllowed.setHours(0, 0, 0, 0);

    const isShortNotice = requestedDate < earliestAllowed;

    const updatedLease = await prisma.lease.update({
      where: { id: leaseId },
      data: {
        status: "NOTICE_GIVEN",
        moveOutStatus: "MOVE_OUT_REQUESTED",
        moveOutRequestDate: new Date(),
        moveOutDate: requestedDate,
        moveOutReason: moveOutReason === "Other" ? `Other: ${otherReasonNote?.trim()}` : moveOutReason,
        forwardingAddress,
        refundMethod: "BANK_TRANSFER",
        refundBankName,
        refundAccountName,
        refundAccountNumber: encryptSymmetric(refundAccountNumber),
        isShortNotice,
        // Store acknowledgement timestamps as legal evidence
        utilitiesAcknowledgedAt: utilitiesAcknowledged ? new Date() : null,
        cleaningAcknowledgedAt: cleaningAcknowledged ? new Date() : null,
      },
    });

    // Update unit status so owner can begin marketing it
    await prisma.unit.update({
      where: { id: lease.unitId },
      data: { status: "NOTICE_GIVEN" },
    });

    // Auto-generate Early Termination Fee Invoice if applicable
    if (isShortNotice && lease.earlyTerminationFee && Number(lease.earlyTerminationFee) > 0) {
      await prisma.invoice.create({
        data: {
          leaseId: lease.id,
          amount: lease.earlyTerminationFee,
          dueDate: requestedDate,
          status: "UNPAID",
          invoiceType: "EARLY_TERMINATION",
          note: `Early termination fee for providing less than ${noticeDays} days notice.`,
        },
      });
    }

    // Notify owner
    try {
      await notify({
        userId: (lease.unit as any).property.ownerId,
        title: "Move-Out Notice Received",
        message: `${isShortNotice ? "⚠️ SHORT NOTICE — " : ""}Tenant has submitted a move-out notice for ${requestedDate.toLocaleDateString()}. Reason: ${moveOutReason}. Forwarding address: ${forwardingAddress}.`,
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
