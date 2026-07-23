import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// GET /api/admin/billing-overview
// Aggregates high-performance billing metrics directly from the DB for the Admin Billing Dashboard
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Calculate Monthly Recurring Revenue (MRR)
    // Sum active pricing tiers prices linked to owners
    const activeSubscribers = await prisma.user.findMany({
      where: {
        role: "OWNER",
        subscriptionStatus: { in: ["Active", "Active (Canceling)"] },
        currentTierId: { not: null },
      },
      include: {
        pricingTier: true,
      },
    });

    const mrr = activeSubscribers.reduce((acc, u) => {
      return acc + (u.pricingTier ? Number(u.pricingTier.price) : 0);
    }, 0);

    const arr = mrr * 12;

    // 2. Count Active Subscribers per Plan
    const plansCount = await prisma.pricingTier.findMany({
      include: {
        _count: {
          select: {
            users: {
              where: {
                role: "OWNER",
                subscriptionStatus: { in: ["Active", "Active (Canceling)", "Trialing"] },
              },
            },
          },
        },
      },
    });

    const tierDistribution = plansCount.map((tier) => ({
      id: tier.id,
      name: tier.name,
      price: tier.price,
      count: tier._count.users,
    }));

    // 3. Subscription Status Distribution
    const statusCounts = await prisma.user.groupBy({
      by: ["subscriptionStatus"],
      where: { role: "OWNER" },
      _count: { _all: true },
    });

    const statuses = statusCounts.map((g) => ({
      status: g.subscriptionStatus || "Inactive",
      count: g._count._all,
    }));

    // 4. Churn Rate Calculation
    // Total canceled vs total subscribed in SubscriptionHistory
    const totalSubscribed = await prisma.subscriptionHistory.count({
      where: { event: "SUBSCRIBED" },
    });
    const totalCanceled = await prisma.subscriptionHistory.count({
      where: { event: "CANCELED" },
    });
    const churnRate = totalSubscribed > 0 ? (totalCanceled / totalSubscribed) * 100 : 0;

    // 5. Past Due Landlords list
    const pastDueUsers = await prisma.user.findMany({
      where: {
        role: "OWNER",
        subscriptionStatus: "Past_Due",
      },
      select: {
        id: true,
        name: true,
        email: true,
        stripeSubscriptionId: true,
        pricingTier: {
          select: {
            name: true,
            price: true,
          },
        },
      },
    });

    // 6. Recent Subscription Events (limit 15)
    const recentEvents = await prisma.subscriptionHistory.findMany({
      take: 15,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      mrr,
      arr,
      subscriberCount: activeSubscribers.length,
      tierDistribution,
      statuses,
      churnRate,
      pastDueCount: pastDueUsers.length,
      pastDueUsers,
      recentEvents: recentEvents.map((e) => ({
        id: e.id,
        userName: e.user.name || "Unknown Owner",
        userEmail: e.user.email,
        event: e.event,
        fromTierName: e.fromTierName,
        toTierName: e.toTierName,
        amountPaid: e.amountPaid,
        createdAt: e.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("Admin billing overview error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
