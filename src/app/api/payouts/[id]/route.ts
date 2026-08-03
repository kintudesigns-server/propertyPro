import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    const userId = (session.user as any).id;
    const { id } = await params;

    const payout = await prisma.payoutRequest.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true, balance: true } },
        tenant: { select: { id: true, name: true, email: true, phone: true } },
        lease: {
          include: {
            unit: {
              include: {
                property: { select: { id: true, name: true, ownerId: true } },
              },
            },
          },
        },
      },
    });

    if (!payout) {
      return NextResponse.json({ error: "Payout record not found" }, { status: 404 });
    }

    // Access control: Owners can only view their own payouts, Tenants theirs, Admin all
    if (role === "OWNER" && payout.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (role === "TENANT" && payout.tenantId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(payout);
  } catch (error: any) {
    console.error("GET /api/payouts/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch payout details" },
      { status: 500 }
    );
  }
}
