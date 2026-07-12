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

    const totalDeducted = (deductions || []).reduce((sum: number, d: any) => sum + Number(d.amount), 0);
    const originalDeposit = Number(lease.securityDeposit || 0);
    const refundAmount = originalDeposit - totalDeducted;

    if (refundAmount < 0) {
      return NextResponse.json({ error: "Deductions cannot exceed security deposit" }, { status: 400 });
    }

    const newDepositStatus = totalDeducted === originalDeposit ? "FULLY_DEDUCTED" : 
                             (totalDeducted > 0 ? "PARTIALLY_REFUNDED" : "REFUNDED");

    // Perform database transactions in a single batch
    const [updatedLease] = await prisma.$transaction([
      prisma.lease.update({
        where: { id: leaseId },
        data: {
          depositStatus: newDepositStatus,
          moveOutStatus: "COMPLETED",
          deductions: deductions,
          refundMethod: refundMethod || "OFFLINE", // Track how owner refunded
          refundRef: refundRef || null,
          status: "TERMINATED", // Mark lease as officially terminated
        },
      }),
      prisma.unit.update({
        where: { id: lease.unitId },
        data: { status: "VACANT" },
      }),
      // Create Transaction record for the refund if refundAmount > 0
      ...(refundAmount > 0 ? [
        prisma.transaction.create({
          data: {
            type: "EXPENSE",
            category: "DEPOSIT",
            amount: refundAmount,
            reference: refundRef || `REFUND_${leaseId.slice(-8)}`,
            status: "COMPLETED", // Offline refunds are marked complete immediately in Model 1
            tenantId: lease.tenantId,
          },
        })
      ] : []),
      // Create Transaction record for the retained deductions if totalDeducted > 0
      ...(totalDeducted > 0 ? [
        prisma.transaction.create({
          data: {
            type: "INCOME",
            category: "DEPOSIT",
            amount: totalDeducted,
            reference: `DEDUCTIONS_${leaseId.slice(-8)}`,
            status: "COMPLETED", 
            tenantId: lease.tenantId,
          },
        })
      ] : []),
    ]);

    // Send notification to tenant
    try {
      await notify({
        userId: lease.tenantId,
        title: "Move-Out Processed",
        message: `Your move-out for Unit ${lease.unit.name} at ${lease.unit.property.name} has been processed. A deposit refund of $${refundAmount.toFixed(2)} has been issued.`,
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
