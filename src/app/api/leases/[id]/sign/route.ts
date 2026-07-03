import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, ctx: any) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "TENANT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Next.js 15 route handler parameter handling
  const { id } = await ctx.params;

  try {
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

    // Security Deposit logic: We no longer block signing before deposit.
    // Tenant reviews terms, signs, and THEN pays deposit.

    // Update lease to ACTIVE and unit to OCCUPIED
    const [updatedLease] = await prisma.$transaction([
      prisma.lease.update({
        where: { id },
        data: { status: "ACTIVE" },
      }),
      prisma.unit.update({
        where: { id: lease.unitId },
        data: { status: "OCCUPIED" },
      }),
    ]);

    return NextResponse.json(updatedLease);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to sign lease" }, { status: 500 });
  }
}
