import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, ctx: any) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "TENANT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await ctx.params;

  try {
    const body = await req.json().catch(() => ({}));
    const { signatureImageUrl } = body;

    const lease = await prisma.lease.findUnique({
      where: { id },
      include: { unit: true },
    });

    if (!lease || lease.tenantId !== (session.user as any).id) {
      return NextResponse.json({ error: "Lease not found or access denied" }, { status: 404 });
    }

    if (lease.status !== "PENDING_SIGNATURE") {
      return NextResponse.json({ error: "Lease is not pending signature" }, { status: 400 });
    }

    // Update lease to ACTIVE and unit to OCCUPIED, store signature
    // Use raw SQL for new fields (signedAt, signatureImageUrl) since Prisma client
    // may not have regenerated yet. Status + unit update via normal Prisma.
    await prisma.$executeRaw`
      UPDATE "Lease"
      SET
        status = 'ACTIVE',
        "signedAt" = NOW(),
        "signatureImageUrl" = ${signatureImageUrl ?? null}
      WHERE id = ${id}
    `;

    await prisma.unit.update({
      where: { id: lease.unitId },
      data: { status: "OCCUPIED" },
    });

    const updatedLease = await prisma.lease.findUnique({ where: { id } });

    return NextResponse.json(updatedLease);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to sign lease" }, { status: 500 });
  }
}
