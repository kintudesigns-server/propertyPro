import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { getStripe } from "@/lib/stripe";

const ALLOWED_REFUND_METHODS = ["ORIGINAL", "CHECK", "OFFLINE", "BANK_TRANSFER"];

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

    // Validate refund method
    if (refundMethod && !ALLOWED_REFUND_METHODS.includes(refundMethod)) {
      return NextResponse.json({ error: "Invalid refund method. Allowed: ORIGINAL, CHECK, OFFLINE, BANK_TRANSFER." }, { status: 400 });
    }

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

    // Legal Note: Owners must be able to force-finalize without tenant acceptance 
    // to comply with the 21-day legal deadline for deposit returns if the tenant goes unresponsive.

    const totalDeducted = (deductions || []).reduce((sum: number, d: any) => sum + Number(d.amount), 0);
    const originalDeposit = Number(lease.securityDeposit || 0);
    const netSettlement = originalDeposit - totalDeducted;
    const refundAmount = Math.max(0, netSettlement);
    const excessBalance = netSettlement < 0 ? Math.abs(netSettlement) : 0;

    const newDepositStatus = totalDeducted >= originalDeposit ? "FULLY_DEDUCTED" :
                             (totalDeducted > 0 ? "PARTIALLY_REFUNDED" : "REFUNDED");

    // Process any linked invoice deductions (race-condition guard)
    const invoiceUpdates = [];
    if (deductions && Array.isArray(deductions)) {
      for (const deduction of deductions) {
        if (deduction.invoiceId) {
          const invoice = await prisma.invoice.findUnique({ where: { id: deduction.invoiceId } });
          if (!invoice) continue;
          if (invoice.status === "PAID") {
            return NextResponse.json({ error: `Invoice "${deduction.description}" was already paid by the tenant. Please refresh to see updated balances.` }, { status: 400 });
          }
          invoiceUpdates.push(
            prisma.invoice.update({
              where: { id: deduction.invoiceId },
              data: { status: "PAID" }
            })
          );
        }
      }
    }

    let actualRefundRef = refundRef;
    const stripe = getStripe();

    // Process Stripe refund for ORIGINAL method
    if (refundAmount > 0 && refundMethod === "ORIGINAL") {
      const depositTx = await prisma.transaction.findFirst({
        where: { tenantId: lease.tenantId, category: "DEPOSIT", type: "INCOME" },
        orderBy: { createdAt: "asc" }
      });

      if (!depositTx || !depositTx.reference || (!depositTx.reference.startsWith("ch_") && !depositTx.reference.startsWith("pi_"))) {
        return NextResponse.json({ error: "Original Stripe charge not found. Cannot refund to original payment method. Please use CHECK or OFFLINE instead." }, { status: 400 });
      }

      try {
        let chargeId = depositTx.reference;
        if (chargeId.startsWith("pi_")) {
          const pi = await stripe.paymentIntents.retrieve(chargeId);
          if (pi.latest_charge) {
            chargeId = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge.id;
          } else {
            throw new Error("Payment intent has no associated charges.");
          }
        }

        const refund = await stripe.refunds.create({
          charge: chargeId,
          amount: Math.round(refundAmount * 100),
        });
        actualRefundRef = refund.id;
      } catch (err: any) {
        console.error("Stripe Refund Error:", err);
        return NextResponse.json({ error: `Stripe Refund Failed: ${err.message}. If the original charge is older than 180 days, please use CHECK or OFFLINE.` }, { status: 400 });
      }
    }

    // CHECK method: reference number is legally required
    if (refundAmount > 0 && refundMethod === "CHECK" && !refundRef) {
      return NextResponse.json({ error: "Check Number is legally required for mailed check refunds." }, { status: 400 });
    }

    if (refundMethod === "CHECK" || refundMethod === "OFFLINE" || refundMethod === "BANK_TRANSFER") {
      actualRefundRef = refundRef || null;
    }

    // Perform all DB updates in a single transaction
    const [updatedLease] = await prisma.$transaction([
      ...invoiceUpdates,
      prisma.lease.update({
        where: { id: leaseId },
        data: {
          depositStatus: newDepositStatus,
          moveOutStatus: "COMPLETED",
          deductions: deductions,
          refundMethod: refundMethod || "OFFLINE",
          refundRef: actualRefundRef || null,
          status: "TERMINATED",
        },
      }),
      prisma.unit.update({
        where: { id: lease.unitId },
        data: { status: "VACANT" },
      }),
      // Track excess balance as invoice for record-keeping
      ...(excessBalance > 0 ? [
        prisma.invoice.create({
          data: {
            leaseId: leaseId,
            amount: excessBalance,
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            invoiceType: "MOVE_OUT_SETTLEMENT",
            status: "UNPAID",
            note: "Outstanding balance from final statement deductions exceeding the security deposit. Owner must pursue collection outside the platform.",
          }
        })
      ] : []),
      // Record the refund as a transaction
      ...(refundAmount > 0 ? [
        prisma.transaction.create({
          data: {
            type: "EXPENSE",
            category: "DEPOSIT",
            amount: refundAmount,
            reference: actualRefundRef || `REFUND_${leaseId.slice(-8)}`,
            status: "COMPLETED",
            tenantId: lease.tenantId,
          },
        })
      ] : []),
      // Record retained deductions as income
      ...(totalDeducted > 0 ? [
        prisma.transaction.create({
          data: {
            type: "INCOME",
            category: "DEPOSIT",
            amount: Math.min(originalDeposit, totalDeducted),
            reference: `DEDUCTIONS_${leaseId.slice(-8)}`,
            status: "COMPLETED",
            tenantId: lease.tenantId,
          },
        })
      ] : []),
    ]);

    // Notify tenant
    try {
      const refundMsg = excessBalance > 0
        ? `Your move-out for Unit ${lease.unit.name} at ${lease.unit.property.name} has been finalized. An outstanding balance of $${excessBalance.toFixed(2)} exceeds your deposit — your landlord will contact you regarding collection.`
        : `Your move-out for Unit ${lease.unit.name} at ${lease.unit.property.name} has been finalized. A deposit refund of $${refundAmount.toFixed(2)} has been issued via ${refundMethod === "ORIGINAL" ? "your original payment method" : refundMethod === "CHECK" ? "mailed check to your forwarding address" : "direct transfer"}.`;

      await notify({
        userId: lease.tenantId,
        title: "Move-Out Finalized",
        message: refundMsg,
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
