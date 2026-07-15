import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

// POST /api/cron/deposit-deadlines
// Run DAILY. Finds leases with a depositDueBy set and enforces the deposit return deadline.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all leases with a deposit deadline set and not yet completed
    const activeMoveOuts = await prisma.lease.findMany({
      where: {
        depositDueBy: { not: null },
        moveOutStatus: {
          notIn: ["COMPLETED", "NONE", "DEPOSIT_OVERDUE"],
        },
      },
      include: {
        tenant: true,
        unit: { include: { property: true } },
      },
    });

    let warned = 0;
    let overdue = 0;
    let processed = 0;

    for (const lease of activeMoveOuts as any[]) {
      const dueBy = new Date(lease.depositDueBy);
      dueBy.setHours(0, 0, 0, 0);

      const daysRemaining = Math.ceil((dueBy.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      processed++;

      if (daysRemaining < 0) {
        // Deadline passed — mark DEPOSIT_OVERDUE
        await prisma.lease.update({
          where: { id: lease.id },
          data: { moveOutStatus: "DEPOSIT_OVERDUE" },
        });

        // Notify owner (urgent)
        try {
          await notify({
            userId: lease.unit.property.ownerId,
            title: "🚨 Deposit Return OVERDUE",
            message: `The deposit return deadline (${dueBy.toLocaleDateString()}) for ${lease.tenant?.name || "tenant"} at ${lease.unit?.property?.name} — ${lease.unit?.name} has passed. Under state law you may be liable for penalties. Please finalize the move-out immediately.`,
            type: "LEASE",
            priority: "HIGH",
            relatedEntityId: lease.id,
          });
        } catch (_) {}

        // Notify tenant of their right to pursue
        try {
          await notify({
            userId: lease.tenantId,
            title: "Deposit Return Deadline Passed",
            message: `Your deposit return deadline (${dueBy.toLocaleDateString()}) for ${lease.unit?.property?.name} has passed and your deposit has not been finalized. If you have not received your deposit or disposition statement, you may have legal recourse under your state's landlord-tenant laws.`,
            type: "LEASE",
            priority: "HIGH",
            relatedEntityId: lease.id,
          });
        } catch (_) {}

        overdue++;
        console.log(`[CRON] deposit-deadlines: Lease ${lease.id} marked DEPOSIT_OVERDUE (due: ${dueBy.toLocaleDateString()}).`);

      } else if (daysRemaining === 7) {
        // 7-day warning
        try {
          await notify({
            userId: lease.unit.property.ownerId,
            title: "⚠️ Deposit Deadline in 7 Days",
            message: `You have 7 days left to finalize the security deposit for ${lease.tenant?.name || "tenant"} at ${lease.unit?.property?.name}. The legal deadline is ${dueBy.toLocaleDateString()}. Please complete the inspection and final statement to avoid penalties.`,
            type: "LEASE",
            priority: "HIGH",
            relatedEntityId: lease.id,
          });
          warned++;
          console.log(`[CRON] deposit-deadlines: Warned owner for lease ${lease.id} (7 days remaining, due: ${dueBy.toLocaleDateString()}).`);
        } catch (_) {}
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cron completed. Processed ${processed} active move-outs. Warned: ${warned}, Overdue: ${overdue}.`,
      processed,
      warned,
      overdue,
    });
  } catch (error: any) {
    console.error("Cron deposit-deadlines error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
