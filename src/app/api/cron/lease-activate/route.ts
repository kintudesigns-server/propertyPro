import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

// POST /api/cron/lease-activate
// Runs daily. Finds all SIGNED leases whose startDate (or moveInDate) is today or past,
// and auto-activates them — transitioning status to ACTIVE and unit to OCCUPIED.
export async function POST(req: NextRequest) {
  // 🔒 CRON SECRET AUTH — prevents public abuse
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all SIGNED leases where the planned move-in date has arrived
    const signedLeases = await prisma.lease.findMany({
      where: {
        status: "SIGNED",
        // Activate if moveInDate <= today, or if no moveInDate, use startDate
        OR: [
          { moveInDate: { lte: new Date() } } as any,
          {
            AND: [
              { moveInDate: null } as any,
              { startDate: { lte: new Date() } },
            ],
          },
        ],
      } as any,
      include: {
        tenant: true,
        unit: { include: { property: true } },
      },
    });

    let activatedCount = 0;

    for (const lease of signedLeases as any[]) {
      await prisma.$transaction([
        prisma.lease.update({
          where: { id: lease.id },
          data: { status: "ACTIVE" },
        }),
        prisma.unit.update({
          where: { id: lease.unitId },
          data: { status: "OCCUPIED" },
        }),
      ]);

      activatedCount++;

      // PRORATED FIRST MONTH: if activation day of month is not 1
      const dayOfMonth = today.getDate();
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const daysRemaining = daysInMonth - dayOfMonth + 1;

      if (dayOfMonth !== 1 && lease.autoGenerateInvoices) {
        const proratedAmount = (Number(lease.monthlyRent) / daysInMonth) * daysRemaining;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (lease.gracePeriodDays || 5));

        const monthLabel = today.toLocaleString("default", { month: "long" });

        const proratedInvoice = await prisma.invoice.create({
          data: {
            leaseId: lease.id,
            amount: Math.round(proratedAmount * 100) / 100,
            dueDate,
            status: "UNPAID",
            note: `Prorated rent for ${monthLabel} (${daysRemaining} days remaining)`,
          },
        });

        // Notify tenant
        try {
          await notify({
            userId: lease.tenantId,
            title: "Prorated Rent Invoice Issued",
            message: `A prorated rent invoice of $${(Math.round(proratedAmount * 100) / 100).toFixed(2)} has been issued for ${daysRemaining} days of ${monthLabel}.`,
            type: "PAYMENT",
            priority: "MEDIUM",
            relatedEntityId: proratedInvoice.id,
          });
        } catch (_) { /* non-fatal */ }
      }

      // Notify tenant their lease is now active
      try {
        await notify({
          userId: lease.tenantId,
          title: "Your Lease is Now Active 🎉",
          message: `Welcome! Your lease for ${lease.unit.property.name} - ${lease.unit.name} has automatically activated on your move-in date. Your rent is due on day ${lease.rentDueDay} of each month.`,
          type: "LEASE",
          priority: "HIGH",
          relatedEntityId: lease.id,
        });
      } catch (_) { /* non-fatal */ }

      // Notify owner
      try {
        await notify({
          userId: lease.unit.property.ownerId,
          title: "Lease Auto-Activated",
          message: `The lease for ${lease.unit.name} at ${lease.unit.property.name} (tenant: ${lease.tenant.name}) has been automatically activated on the move-in date.`,
          type: "LEASE",
          priority: "LOW",
          relatedEntityId: lease.id,
        });
      } catch (_) { /* non-fatal */ }

      console.log(`[CRON] Lease ${lease.id} auto-activated for tenant ${lease.tenant.email}`);
    }

    // ----------------------------------------------------
    // SAFETY CHECK: Find stuck RESERVED units (move-in delayed by 7+ days)
    // ----------------------------------------------------
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const stuckLeases = await prisma.lease.findMany({
      where: {
        status: "SIGNED",
        OR: [
          { moveInDate: { lt: sevenDaysAgo } } as any,
          {
            AND: [
              { moveInDate: null } as any,
              { startDate: { lt: sevenDaysAgo } },
            ],
          },
        ],
      } as any,
      include: {
        tenant: true,
        unit: { include: { property: true } },
      },
    });

    for (const lease of stuckLeases as any[]) {
      try {
        await notify({
          userId: lease.unit.property.ownerId,
          title: "Action Required: Reserved Unit Stuck",
          message: `The unit "${lease.unit.name}" at "${lease.unit.property.name}" has been RESERVED for tenant "${lease.tenant.name}" but has not moved in. It is 7+ days past the scheduled move-in date of ${new Date(lease.moveInDate || lease.startDate).toLocaleDateString()}. Please activate the lease or cancel it to release the unit.`,
          type: "LEASE",
          priority: "HIGH",
          relatedEntityId: lease.id,
        });
      } catch (_) { /* non-fatal */ }
    }

    return NextResponse.json({
      success: true,
      message: `Cron completed. Auto-activated ${activatedCount} lease(s), checked ${stuckLeases.length} stuck reserved lease(s).`,
    });
  } catch (error: any) {
    console.error("Cron lease-activate error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
