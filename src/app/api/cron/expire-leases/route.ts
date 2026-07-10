import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

// POST /api/cron/expire-leases
// Run DAILY. Finds ACTIVE leases whose endDate has passed and marks them EXPIRED,
// frees up the unit, and notifies both owner and tenant.
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

    // Find all ACTIVE leases that have passed their endDate
    // and are not in a RENEWED state
    const expiredLeases = await prisma.lease.findMany({
      where: {
        status: "ACTIVE",
        endDate: { lt: today },
        renewalStatus: { not: "RENEWED" },
      },
      include: {
        tenant: true,
        unit: { include: { property: true } },
      },
    });

    let expiredCount = 0;

    for (const lease of expiredLeases as any[]) {
      // Atomically expire the lease and free the unit
      await prisma.$transaction([
        prisma.lease.update({
          where: { id: lease.id },
          data: {
            status: "EXPIRED",
            renewalStatus: "NON_RENEWAL",
          },
        }),
        prisma.unit.update({
          where: { id: lease.unitId },
          data: { status: "VACANT" },
        }),
      ]);

      expiredCount++;

      // Write to audit log
      try {
        await (prisma as any).auditLog.create({
          data: {
            entityType: "LEASE",
            entityId: lease.id,
            action: "STATUS_CHANGED",
            actorId: null,
            actorRole: "SYSTEM",
            oldValue: { status: "ACTIVE" },
            newValue: { status: "EXPIRED" },
            note: `Lease auto-expired on ${today.toLocaleDateString()}. End date was ${new Date(lease.endDate).toLocaleDateString()}.`,
          },
        });
      } catch (_) {}

      // Notify tenant
      try {
        await notify({
          userId: lease.tenantId,
          title: "Your Lease Has Expired",
          message: `Your lease for ${lease.unit.property.name} — ${lease.unit.name} expired on ${new Date(lease.endDate).toLocaleDateString()}. Please contact your property manager if you wish to continue your tenancy.`,
          type: "LEASE",
          priority: "HIGH",
          relatedEntityId: lease.id,
        });
      } catch (_) {}

      // Notify owner
      try {
        await notify({
          userId: lease.unit.property.ownerId,
          title: "Lease Expired — Unit Now Vacant",
          message: `The lease for ${lease.unit.name} (tenant: ${lease.tenant.name}) has expired. The unit has been automatically marked as Vacant and is now available for new listings.`,
          type: "LEASE",
          priority: "MEDIUM",
          relatedEntityId: lease.id,
        });
      } catch (_) {}

      console.log(`[CRON] Lease ${lease.id} auto-expired. Unit ${lease.unitId} set to VACANT.`);
    }

    return NextResponse.json({
      success: true,
      message: `Cron completed. Auto-expired ${expiredCount} lease(s).`,
      expired: expiredCount,
    });
  } catch (error: any) {
    console.error("Cron expire-leases error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
