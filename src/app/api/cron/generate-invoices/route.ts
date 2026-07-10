import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { sendEmail } from "@/lib/email";

// POST /api/cron/generate-invoices
// CRITICAL CRON — Run on the 1st of every month (or daily with idempotency guard).
// Finds all ACTIVE leases with autoGenerateInvoices=true and creates the
// next month's rent invoice if one doesn't already exist for that period.
export async function POST(req: NextRequest) {
  // 🔒 CRON SECRET AUTH — prevents public abuse
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Target the NEXT month's invoice (generate on 1st for next month billing period)
    // If running on the 1st of July, generate for July (current month)
    const targetYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const targetMonth = (currentMonth + 1) % 12; // 0-indexed

    // First day of the target invoice period
    const invoicePeriodStart = new Date(targetYear, targetMonth, 1);
    // Last day of the target period (for note labeling)
    const monthLabel = invoicePeriodStart.toLocaleString("default", { month: "long", year: "numeric" });

    // Find all ACTIVE leases that should auto-generate
    const activeLeases = await prisma.lease.findMany({
      where: {
        status: "ACTIVE",
        autoGenerateInvoices: true,
        endDate: { gt: invoicePeriodStart }, // Don't generate past the lease end date
      },
      include: {
        tenant: true,
        unit: { include: { property: true } },
        invoices: {
          where: {
            invoiceType: "RENT",
            dueDate: {
              gte: new Date(targetYear, targetMonth, 1),
              lt: new Date(targetYear, targetMonth + 1, 1),
            },
          },
        },
      },
    });

    let generatedCount = 0;
    let skippedCount = 0;

    for (const lease of activeLeases as any[]) {
      // IDEMPOTENCY: Skip if a RENT invoice already exists for this period
      if (lease.invoices.length > 0) {
        skippedCount++;
        continue;
      }

      // Calculate due date: rentDueDay of target month
      const rentDueDay = Math.min(lease.rentDueDay || 1, 28); // cap at 28 for Feb safety
      const dueDate = new Date(targetYear, targetMonth, rentDueDay);

      const invoice = await prisma.invoice.create({
        data: {
          leaseId: lease.id,
          amount: Number(lease.monthlyRent),
          dueDate,
          status: "UNPAID",
          invoiceType: "RENT",
          note: `Monthly rent — ${monthLabel}`,
        },
      });

      generatedCount++;

      // Notify tenant
      try {
        await notify({
          userId: lease.tenantId,
          title: `Rent Invoice — ${monthLabel}`,
          message: `Your rent invoice of $${Number(lease.monthlyRent).toFixed(2)} for ${monthLabel} is due on ${dueDate.toLocaleDateString("en-US", { month: "long", day: "numeric" })}. Please log in to make your payment.`,
          type: "PAYMENT",
          priority: "MEDIUM",
          relatedEntityId: invoice.id,
        });
      } catch (_) { /* non-fatal */ }

      // Auto-email if enabled on lease
      if (lease.autoEmailInvoices) {
        try {
          if (typeof sendEmail === "function") {
            await sendEmail({
              to: lease.tenant.email,
              subject: `Rent Invoice Due — ${monthLabel} | ${lease.unit.property.name}`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1E293B;">
                  <h2 style="color: #0F172A;">Rent Invoice — ${monthLabel}</h2>
                  <p>Dear ${lease.tenant.name},</p>
                  <p>Your rent invoice has been generated for <strong>${monthLabel}</strong>.</p>
                  <table style="width:100%; border-collapse:collapse; margin: 20px 0;">
                    <tr><td style="padding:8px; border:1px solid #E2E8F0; font-weight:bold;">Property</td><td style="padding:8px; border:1px solid #E2E8F0;">${lease.unit.property.name} — ${lease.unit.name}</td></tr>
                    <tr><td style="padding:8px; border:1px solid #E2E8F0; font-weight:bold;">Amount Due</td><td style="padding:8px; border:1px solid #E2E8F0; color:#DC2626; font-weight:bold;">$${Number(lease.monthlyRent).toFixed(2)}</td></tr>
                    <tr><td style="padding:8px; border:1px solid #E2E8F0; font-weight:bold;">Due Date</td><td style="padding:8px; border:1px solid #E2E8F0;">${dueDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</td></tr>
                    <tr><td style="padding:8px; border:1px solid #E2E8F0; font-weight:bold;">Grace Period</td><td style="padding:8px; border:1px solid #E2E8F0;">${lease.gracePeriodDays} days</td></tr>
                  </table>
                  <p>Please log in to your tenant dashboard to make your payment before the due date to avoid late fees.</p>
                  <p style="color:#64748B; font-size:12px;">PropertyPro — Automated Billing System</p>
                </div>
              `,
            });
          }
        } catch (_) { /* email failures are non-fatal */ }
      }

      console.log(`[CRON] Invoice generated for lease ${lease.id} — ${monthLabel} — $${Number(lease.monthlyRent)}`);
    }

    return NextResponse.json({
      success: true,
      message: `Cron completed. Generated ${generatedCount} invoice(s) for ${monthLabel}. Skipped ${skippedCount} (already existed).`,
      generated: generatedCount,
      skipped: skippedCount,
      period: monthLabel,
    });
  } catch (error: any) {
    console.error("Cron generate-invoices error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
