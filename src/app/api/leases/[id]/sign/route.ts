import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { auditLog } from "@/lib/audit-log";

export async function POST(req: NextRequest, ctx: any) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "TENANT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await ctx.params;

  try {
    const body = await req.json().catch(() => ({}));
    const { signatureImageUrl } = body;

    // FIX #11 — Block empty/missing signatures
    if (!signatureImageUrl || typeof signatureImageUrl !== "string" || signatureImageUrl.length < 100) {
      return NextResponse.json(
        { error: "A valid drawn signature is required to execute this lease." },
        { status: 400 }
      );
    }

    const lease = await prisma.lease.findUnique({
      where: { id },
      include: { unit: { include: { property: true } } },
    });

    if (!lease || lease.tenantId !== (session.user as any).id) {
      return NextResponse.json({ error: "Lease not found or access denied" }, { status: 404 });
    }

    if (lease.status !== "PENDING_SIGNATURE") {
      return NextResponse.json({ error: "Lease is not pending signature" }, { status: 400 });
    }

    // FIX #2 — Require security deposit to be paid before signing
    if (
      lease.securityDeposit &&
      Number(lease.securityDeposit) > 0 &&
      (!lease.depositPaidAt || Number(lease.depositPaidAmount || 0) <= 0)
    ) {
      return NextResponse.json(
        {
          error: `Your security deposit of $${Number(lease.securityDeposit).toFixed(2)} must be paid before you can sign this lease. Please complete your deposit payment first.`,
        },
        { status: 400 }
      );
    }

    // FIX #1 — Lease goes SIGNED (not ACTIVE). Unit becomes RESERVED (not OCCUPIED).
    // Lease activates only when the owner confirms key handover OR via cron on moveInDate/startDate.
    await prisma.$executeRaw`
      UPDATE "Lease"
      SET
        status = 'SIGNED',
        "signedAt" = NOW(),
        "signatureImageUrl" = ${signatureImageUrl}
      WHERE id = ${id}
    `;

    await prisma.unit.update({
      where: { id: lease.unitId },
      data: { status: "RESERVED" },
    });

    await auditLog({
      entityType: "LEASE",
      entityId: id,
      action: "SIGNED",
      actorId: (session.user as any).id,
      actorRole: "TENANT",
      oldValue: { status: "PENDING_SIGNATURE" },
      newValue: { status: "SIGNED" },
      note: `Tenant signed the lease agreement.`,
    });

    // Notify owner: lease is signed and awaiting move-in confirmation
    try {
      await notify({
        userId: (lease.unit as any).property.ownerId,
        title: "Lease Signed – Awaiting Move-In Confirmation",
        message: `The tenant has signed the lease for ${(lease.unit as any).property.name}. The lease will activate on the move-in date. Please confirm key handover when the tenant arrives.`,
        type: "LEASE",
        priority: "HIGH",
        relatedEntityId: lease.id,
      });
    } catch (_) { /* non-fatal */ }

    const updatedLease = await prisma.lease.findUnique({ where: { id } });
    return NextResponse.json(updatedLease);

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to sign lease" }, { status: 500 });
  }
}
