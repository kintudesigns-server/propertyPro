import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

// POST /api/cron/late-fees
// Run DAILY. Finds all UNPAID invoices past their grace period, marks them OVERDUE,
// then creates a late fee invoice if the lease has lateFeeAmount configured.
export async function POST(req: NextRequest) {
  // 🔒 CRON SECRET AUTH
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let markedOverdue = 0;
    let lateFeesCreated = 0;

    // Step 1: Find UNPAID invoices that are past their grace period
    // We compare dueDate + gracePeriodDays (from the lease) < today
    const unpaidInvoices = await prisma.invoice.findMany({
      where: {
        status: "UNPAID",
        invoiceType: { in: ["RENT", "PRORATED"] },
      },
      include: {
        lease: {
          include: {
            tenant: true,
            unit: { include: { property: true } },
          },
        },
      },
    });

    for (const invoice of unpaidInvoices as any[]) {
      const lease = invoice.lease;
      const gracePeriodDays = lease.gracePeriodDays || 5;

      // Calculate the actual overdue trigger date
      const overdueDate = new Date(invoice.dueDate);
      overdueDate.setDate(overdueDate.getDate() + gracePeriodDays);
      overdueDate.setHours(0, 0, 0, 0);

      if (today <= overdueDate) continue; // Still within grace period

      // Mark invoice as OVERDUE
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: "OVERDUE" },
      });
      markedOverdue++;

      // Notify tenant their invoice is now overdue
      try {
        await notify({
          userId: lease.tenantId,
          title: "⚠️ Rent Invoice Now Overdue",
          message: `Your rent invoice of $${Number(invoice.amount).toFixed(2)} for ${lease.unit.property.name} — ${lease.unit.name} is now overdue. Please pay immediately to avoid additional late fees.`,
          type: "PAYMENT",
          priority: "HIGH",
          relatedEntityId: invoice.id,
        });
      } catch (_) {}

      // Notify owner
      try {
        await notify({
          userId: lease.unit.property.ownerId,
          title: "Tenant Invoice Overdue",
          message: `Rent invoice of $${Number(invoice.amount).toFixed(2)} for ${lease.unit.name} (tenant: ${lease.tenant.name}) is now overdue.`,
          type: "PAYMENT",
          priority: "MEDIUM",
          relatedEntityId: invoice.id,
        });
      } catch (_) {}

      // Step 2: Apply late fee if configured and not already charged this cycle
      const lateFeeAmount = Number(lease.lateFeeAmount || 0);
      if (lateFeeAmount <= 0) continue;

      // Check: has a late fee already been issued for this invoice?
      const existingLateFee = await prisma.invoice.findFirst({
        where: {
          leaseId: lease.id,
          invoiceType: "LATE_FEE",
          note: { contains: invoice.id },
        },
      });
      if (existingLateFee) continue; // Already charged

      // Calculate the fee
      let feeAmount = lateFeeAmount;
      if (lease.lateFeeType === "PERCENTAGE") {
        feeAmount = (Number(invoice.amount) * lateFeeAmount) / 100;
      }
      feeAmount = Math.round(feeAmount * 100) / 100;

      // Due immediately (same day)
      const lateFeeInvoice = await prisma.invoice.create({
        data: {
          leaseId: lease.id,
          amount: feeAmount,
          dueDate: today,
          status: "UNPAID",
          invoiceType: "LATE_FEE",
          note: `Late fee for overdue invoice ${invoice.id.slice(-8)} — ${lease.lateFeeType === "PERCENTAGE" ? `${lateFeeAmount}% of $${Number(invoice.amount).toFixed(2)}` : "Fixed fee"}`,
        },
      });
      lateFeesCreated++;

      // Notify tenant about the late fee
      try {
        await notify({
          userId: lease.tenantId,
          title: "Late Fee Applied",
          message: `A late fee of $${feeAmount.toFixed(2)} has been applied to your account because your rent invoice was not paid within the ${gracePeriodDays}-day grace period.`,
          type: "PAYMENT",
          priority: "HIGH",
          relatedEntityId: lateFeeInvoice.id,
        });
      } catch (_) {}

      // Notify owner
      try {
        await notify({
          userId: lease.unit.property.ownerId,
          title: "Late Fee Charged to Tenant",
          message: `A late fee of $${feeAmount.toFixed(2)} has been automatically applied to ${lease.tenant.name}'s account for Unit ${lease.unit.name}.`,
          type: "PAYMENT",
          priority: "LOW",
          relatedEntityId: lateFeeInvoice.id,
        });
      } catch (_) {}

      console.log(`[CRON] Late fee $${feeAmount} applied on lease ${lease.id} for overdue invoice ${invoice.id}`);
    }

    return NextResponse.json({
      success: true,
      message: `Cron completed. Marked ${markedOverdue} invoice(s) OVERDUE. Created ${lateFeesCreated} late fee invoice(s).`,
      markedOverdue,
      lateFeesCreated,
    });
  } catch (error: any) {
    console.error("Cron late-fees error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
