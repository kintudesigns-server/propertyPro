import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { PayoutStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  try {
    let payouts: any[] = [];
    if (role === "SUPERADMIN") {
      payouts = await prisma.payoutRequest.findMany({
        include: { owner: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      });
    } else if (role === "OWNER") {
      payouts = await prisma.payoutRequest.findMany({
        where: { ownerId: userId },
        orderBy: { createdAt: "desc" },
      });
    } else {
      payouts = [];
    }

    return NextResponse.json(payouts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch payouts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const ownerId = (session.user as any).id;

  try {
    const { amount, bankName, accountNumber, accountName } = await req.json();

    if (!amount || !bankName || !accountNumber || !accountName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const withdrawAmount = Number(amount);
    if (withdrawAmount <= 0) {
      return NextResponse.json({ error: "Invalid payout amount" }, { status: 400 });
    }

    // Check owner balance
    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
    });

    if (!owner) {
      return NextResponse.json({ error: "Owner account not found" }, { status: 404 });
    }

    const currentBalance = Number(owner.balance);
    if (currentBalance < withdrawAmount) {
      return NextResponse.json({ error: "Insufficient balance in ledger" }, { status: 400 });
    }

    // Create payout request and subtract from owner active balance in a transaction
    const [payout] = await prisma.$transaction([
      prisma.payoutRequest.create({
        data: {
          ownerId,
          amount: withdrawAmount,
          bankName,
          accountNumber,
          accountName,
          status: PayoutStatus.PENDING,
        },
      }),
      prisma.user.update({
        where: { id: ownerId },
        data: {
          balance: {
            decrement: withdrawAmount,
          },
        },
      }),
    ]);

    return NextResponse.json(payout, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create payout request" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Access denied. Admins only." }, { status: 403 });
  }

  try {
    const { payoutId, status } = await req.json();

    if (!payoutId || !status) {
      return NextResponse.json({ error: "Missing payoutId or status" }, { status: 400 });
    }

    const payout = await prisma.payoutRequest.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      return NextResponse.json({ error: "Payout request not found" }, { status: 404 });
    }

    if (payout.status !== PayoutStatus.PENDING) {
      return NextResponse.json({ error: "Payout is already processed" }, { status: 400 });
    }

    if (status === PayoutStatus.COMPLETED) {
      const updated = await prisma.payoutRequest.update({
        where: { id: payoutId },
        data: { status: PayoutStatus.COMPLETED },
      });
      return NextResponse.json(updated);
    } else if (status === PayoutStatus.REJECTED) {
      // Return the money back to the owner balance
      const [updated] = await prisma.$transaction([
        prisma.payoutRequest.update({
          where: { id: payoutId },
          data: { status: PayoutStatus.REJECTED },
        }),
        prisma.user.update({
          where: { id: payout.ownerId },
          data: {
            balance: {
              increment: Number(payout.amount),
            },
          },
        }),
      ]);
      return NextResponse.json(updated);
    } else {
      return NextResponse.json({ error: "Invalid status update" }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update payout request" }, { status: 500 });
  }
}
