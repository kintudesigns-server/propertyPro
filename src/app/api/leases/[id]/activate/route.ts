import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { auditLog } from "@/lib/audit-log";

// POST /api/leases/[id]/activate
// Called by the OWNER to confirm physical key handover, which transitions
// a SIGNED lease to ACTIVE and the unit from RESERVED to OCCUPIED.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const lease = await prisma.lease.findUnique({
      where: { id },
      include: { unit: { include: { property: true } }, tenant: true },
    });

    if (!lease) {
      return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    }

    if ((lease.unit as any).property.ownerId !== (session.user as any).id) {
      return NextResponse.json({ error: "Forbidden: Not your property" }, { status: 403 });
    }

    if (lease.status !== "SIGNED") {
      return NextResponse.json(
        { error: `Lease must be in SIGNED status to activate. Current status: ${lease.status}` },
        { status: 400 }
      );
    }

    const now = new Date();

    const [updatedLease] = await prisma.$transaction([
      prisma.lease.update({
        where: { id },
        data: {
          status: "ACTIVE",
          keysHandedOverAt: now,
        } as any,
      }),
      prisma.unit.update({
        where: { id: lease.unitId },
        data: { status: "OCCUPIED" },
      }),
    ]);

    // Write audit log
    await auditLog({
      entityType: "LEASE",
      entityId: id,
      action: "ACTIVATED",
      actorId: (session.user as any).id,
      actorRole: "OWNER",
      oldValue: { status: "SIGNED" },
      newValue: { status: "ACTIVE", keysHandedOverAt: now.toISOString() },
      note: `Owner confirmed key handover. Lease activated.`,
    });

    // PRORATED FIRST MONTH: if activation day of month is not 1
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = daysInMonth - dayOfMonth + 1;

    if (dayOfMonth !== 1 && lease.autoGenerateInvoices) {
      const proratedAmount = (Number(lease.monthlyRent) / daysInMonth) * daysRemaining;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (lease.gracePeriodDays || 5));

      const monthLabel = now.toLocaleString("default", { month: "long" });

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

    // Notify tenant that their lease is now officially active
    try {
      await notify({
        userId: lease.tenantId,
        title: "Your Lease is Now Active 🎉",
        message: `Welcome home! Your lease for ${(lease.unit as any).property.name} - ${(lease.unit as any).name} is now active. Your rent is due on day ${lease.rentDueDay} of each month.`,
        type: "LEASE",
        priority: "HIGH",
        relatedEntityId: lease.id,
      });
    } catch (_) { /* non-fatal */ }

    return NextResponse.json(updatedLease);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to activate lease" }, { status: 500 });
  }
}
