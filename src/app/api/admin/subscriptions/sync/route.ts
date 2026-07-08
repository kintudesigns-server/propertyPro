import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.stripeSubscriptionId) {
      return NextResponse.json({ error: "User has no active Stripe subscription ID to sync" }, { status: 400 });
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 });
    }

    // Fetch latest subscription data from Stripe
    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

    let status = "Inactive";
    if (subscription.status === "active" || subscription.status === "trialing") {
      status = "Active";
    } else if (subscription.status === "past_due" || subscription.status === "unpaid") {
      status = "Past_Due";
    }

    // Attempt to map the price back to a tier if needed (optional)
    const priceId = subscription.items.data[0]?.price.id;
    let tierUpdate = {};
    if (priceId) {
      const price = await stripe.prices.retrieve(priceId, { expand: ["product"] });
      const product = price.product as any;
      const tierId = product.metadata?.tierId;
      if (tierId) {
         tierUpdate = { currentTierId: tierId };
      }
    }

    // Update the database
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: status,
        ...tierUpdate
      },
      include: {
        pricingTier: true
      }
    });

    return NextResponse.json({ 
      success: true, 
      status: updatedUser.subscriptionStatus,
      tier: updatedUser.pricingTier?.name
    });

  } catch (error: any) {
    console.error("Stripe sync error:", error);
    return NextResponse.json({ error: error.message || "Failed to sync" }, { status: 500 });
  }
}
