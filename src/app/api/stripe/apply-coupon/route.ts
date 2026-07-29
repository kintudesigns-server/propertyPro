import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

// POST /api/stripe/apply-coupon
// Applies a 100%-off 1-month coupon to the user's active subscription as a retention offer.
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { pricingTier: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.stripeSubscriptionId) {
      return NextResponse.json({ error: "No active subscription found to apply offer." }, { status: 400 });
    }

    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

    if (subscription.status !== "active" && subscription.status !== "trialing") {
      return NextResponse.json({ error: "Subscription is not active." }, { status: 400 });
    }

    // Check if they already accepted a retention offer before (prevent abuse)
    const existingHistory = await prisma.subscriptionHistory.findFirst({
      where: {
        userId: user.id,
        event: "RETENTION_OFFER_ACCEPTED",
      },
    });

    if (existingHistory) {
      return NextResponse.json({
        error: "You have already redeemed a retention discount on this account.",
        alreadyRedeemed: true,
      }, { status: 400 });
    }

    // 1. Create a 1-month 100% off coupon in Stripe dynamically
    const coupon = await stripe.coupons.create({
      percent_off: 100,
      duration: "once",
      name: "1-Month Free Retention Offer",
    });

    // 2. Apply it to the subscription
    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      discounts: [{ coupon: coupon.id }],
    });

    // 3. Write event to SubscriptionHistory
    await prisma.subscriptionHistory.create({
      data: {
        userId: user.id,
        fromTierId: user.currentTierId,
        fromTierName: user.pricingTier?.name || null,
        toTierId: user.currentTierId,
        toTierName: user.pricingTier?.name || null,
        event: "RETENTION_OFFER_ACCEPTED",
        amountPaid: 0,
      },
    });

    // 4. Create in-app notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: "🎁 Gift Applied: 1 Month Free",
        message: `Thank you for staying with us! We have successfully applied a 100% discount on your next subscription invoice. Your next month is completely free.`,
        type: "SYSTEM",
        priority: "HIGH",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Apply coupon error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to apply retention discount." },
      { status: 500 }
    );
  }
}
