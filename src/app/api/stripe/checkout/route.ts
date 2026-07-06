import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-04-10" as any,
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tierId } = await req.json();
    if (!tierId) {
      return NextResponse.json({ error: "Pricing tier ID is required" }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { pricingTier: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const tier = await prisma.pricingTier.findUnique({
      where: { id: tierId },
    });

    if (!tier) {
      return NextResponse.json({ error: "Pricing tier not found" }, { status: 404 });
    }

    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Create or retrieve Stripe Customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          userId: user.id,
        },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Check if user already has an active subscription to update (Proration)
    if (user.stripeSubscriptionId && user.pricingTier && user.pricingTier.id !== tierId) {
      const existingSubscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      if (existingSubscription.status === "active" || existingSubscription.status === "trialing") {
         return NextResponse.json({ 
           error: "You already have an active subscription. Please manage your plan through the billing portal.",
           requiresPortal: true
         }, { status: 400 });
      }
    }

    // Create Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${tier.name} Subscription`,
              description: tier.description || undefined,
            },
            unit_amount: Math.round(Number(tier.price) * 100), // convert to cents
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/dashboard/owner?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${origin}/dashboard/owner?canceled=true`,
      metadata: {
        userId: user.id,
        tierId: tier.id,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error("Stripe Checkout Error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session." },
      { status: 500 }
    );
  }
}
