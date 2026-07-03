import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { getStripe } from "@/lib/stripe";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { deductions, refundMethod, refundRef } = await req.json();
    const { id: leaseId } = await params;

    // Verify lease ownership
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: { tenant: true, unit: { include: { property: true } } },
    });

    if (!lease || lease.unit.property.ownerId !== (session.user as any).id) {
      return NextResponse.json({ error: "Lease not found or access denied" }, { status: 404 });
    }

    if (lease.depositStatus !== "HELD") {
      return NextResponse.json({ error: "Deposit already processed" }, { status: 400 });
    }

    if (lease.moveOutStatus !== "TENANT_ACCEPTED") {
      return NextResponse.json({ error: "Tenant must review and accept deductions first" }, { status: 400 });
    }

    if (
      !lease.tenant.bankName ||
      !lease.tenant.accountNumber ||
      !lease.tenant.accountName
    ) {
      return NextResponse.json({ error: "Tenant bank details are missing" }, { status: 400 });
    }

    const totalDeducted = (deductions || []).reduce((sum: number, d: any) => sum + Number(d.amount), 0);
    const originalDeposit = Number(lease.securityDeposit || 0);
    const refundAmount = originalDeposit - totalDeducted;

    if (refundAmount < 0) {
      return NextResponse.json({ error: "Deductions cannot exceed security deposit" }, { status: 400 });
    }

    const newStatus = totalDeducted === originalDeposit ? "FULLY_DEDUCTED" : "PENDING_ADMIN_PAYOUT";

    // Perform database transactions in a single batch
    const [updatedLease] = await prisma.$transaction([
      prisma.lease.update({
        where: { id: leaseId },
        data: {
          depositStatus: newStatus,
          moveOutStatus: newStatus === "FULLY_DEDUCTED" ? "COMPLETED" : "PENDING_ADMIN_PAYOUT",
          deductions: deductions,
          refundMethod: refundMethod || null,
          refundRef: refundRef || null,
          status: "EXPIRED", // Mark lease as officially moved out/expired
        },
      }),
      prisma.unit.update({
        where: { id: lease.unitId },
        data: { status: "VACANT" },
      }),
      // Decrement owner balance by refund amount if refundAmount > 0
      ...(refundAmount > 0 ? [
        prisma.user.update({
          where: { id: lease.unit.property.ownerId },
          data: {
            balance: {
              decrement: refundAmount,
            },
          },
        })
      ] : []),
      // Create Transaction record for the refund if refundAmount > 0
      ...(refundAmount > 0 ? [
        prisma.transaction.create({
          data: {
            type: "EXPENSE",
            category: "DEPOSIT",
            amount: refundAmount,
            reference: refundRef || `PENDING_ADMIN_${leaseId.slice(-8)}`,
            status: "PENDING",
            tenantId: lease.tenantId,
          },
        })
      ] : []),
      // Create PayoutRequest for the tenant if refundAmount > 0
      ...(refundAmount > 0 ? [
        prisma.payoutRequest.create({
          data: {
            tenantId: lease.tenantId,
            leaseId: lease.id,
            amount: refundAmount,
            status: "PENDING",
            bankName: lease.tenant.bankName || refundMethod || "BANK_TRANSFER",
            accountNumber: lease.tenant.accountNumber || "PENDING ADMIN PAYOUT",
            accountName: lease.tenant.accountName || lease.tenant.name || "Tenant",
          },
        })
      ] : []),
    ]);

    // Send notification to tenant
    try {
      await notify({
        userId: lease.tenantId,
        title: "Move-Out Processed - Refund Pending Admin Review",
        message: `Your move-out for Unit ${lease.unit.name} at ${lease.unit.property.name} has been processed. A deposit refund of $${refundAmount.toFixed(2)} is pending admin approval and disbursement.`,
        type: "LEASE",
        priority: "HIGH",
        relatedEntityId: lease.id,
      });
    } catch (err) {
      console.error("Failed to send move-out notification:", err);
    }

    return NextResponse.json(updatedLease);
  } catch (error: any) {
    console.error("Failed to process move out:", error);
    return NextResponse.json({ error: error.message || "Failed to process move out" }, { status: 500 });
  }
}
