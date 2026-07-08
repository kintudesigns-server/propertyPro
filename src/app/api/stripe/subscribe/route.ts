import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

// POST /api/stripe/subscribe
// Creates a Stripe SetupIntent + returns client_secret for embedded Stripe Elements.
// After payment method is confirmed on client, a subscription is created via webhook.
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

    const tier = await prisma.pricingTier.findUnique({ where: { id: tierId } });
    if (!tier) {
      return NextResponse.json({ error: "Pricing tier not found" }, { status: 404 });
    }

    // Backend validation: Prevent downgrade if they exceed the new tier's unit limit
    const unitCount = await prisma.unit.count({
      where: { property: { ownerId: userId } }
    });

    if (unitCount > tier.maxUnits) {
      return NextResponse.json({ 
        error: `Limit Exceeded: You currently have ${unitCount} units, but the ${tier.name} plan only allows up to ${tier.maxUnits}. Please delete units before downgrading.`
      }, { status: 400 });
    }

    const stripe = getStripe();
    if (!stripe) throw new Error("Stripe not initialized");

    // Create or retrieve Stripe Customer
    let customerId = user.stripeCustomerId;
    
    // Auto-heal logic: Check if the customer actually exists in Stripe (handles developers swapping API keys)
    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId);
      } catch (err: any) {
        if (err.message?.includes("No such customer")) {
          customerId = null; // Force recreation
        } else {
          throw err;
        }
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId, stripeSubscriptionId: null, subscriptionStatus: "Inactive" },
      });
    }

    // Look for existing price or create one
    let priceId: string;
    const existingPrices = await stripe.prices.list({
      active: true,
      lookup_keys: [`tier_${tierId}`],
    });

    if (existingPrices.data.length > 0) {
      priceId = existingPrices.data[0].id;
    } else {
      const product = await stripe.products.create({
        name: `${tier.name} Subscription`,
        description: tier.description || `Up to ${tier.maxUnits} units`,
        metadata: { tierId: tier.id },
      });

      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(Number(tier.price) * 100),
        currency: "usd",
        recurring: { interval: "month" },
        lookup_key: `tier_${tierId}`,
      });
      priceId = price.id;
    }

    // Handle Upgrading an Existing Subscription
    if (user.stripeSubscriptionId) {
      const existingSub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      
      if (existingSub.status === "active" || existingSub.status === "trialing") {
        if (user.pricingTier?.id === tierId) {
          return NextResponse.json({
            error: "You are already subscribed to this plan.",
            alreadySubscribed: true,
          }, { status: 400 });
        }
        
        // Update the existing subscription
        const updatedSub = await stripe.subscriptions.update(user.stripeSubscriptionId, {
          items: [{
            id: existingSub.items.data[0].id,
            price: priceId,
          }],
          proration_behavior: 'always_invoice', // Invoice them immediately for the difference
          payment_behavior: 'pending_if_incomplete',
          expand: ['latest_invoice.payment_intent'],
        });

        // Update database
        await prisma.user.update({
          where: { id: user.id },
          data: { currentTierId: tier.id },
        });

        const invoice = updatedSub.latest_invoice as any;
        const paymentIntent = invoice?.payment_intent as any;

        // If payment is required (e.g. card requires 3DS, or no default payment method on file)
        if (paymentIntent && paymentIntent.status === 'requires_payment_method' || paymentIntent?.status === 'requires_action') {
           return NextResponse.json({
             clientSecret: paymentIntent.client_secret,
             subscriptionId: updatedSub.id,
             tierName: tier.name,
             tierPrice: tier.price,
           });
        }

        // Otherwise, it was successful immediately (paid from balance or card charged successfully without action)
        return NextResponse.json({ upgraded: true });
      }
    }

    // Create the subscription in incomplete state to get a PaymentIntent client_secret
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      metadata: {
        userId: user.id,
        tierId: tier.id,
      },
    });

    const invoice = subscription.latest_invoice as any;
    const paymentIntent = invoice?.payment_intent as any;

    // Store the subscription ID on the user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        stripeSubscriptionId: subscription.id,
        currentTierId: tier.id,
        // If price is 0, there is no payment intent, so we instantly mark it active
        subscriptionStatus: Number(tier.price) === 0 ? "Active" : user.subscriptionStatus,
      },
    });

    if (Number(tier.price) === 0 || (paymentIntent && paymentIntent.status === 'succeeded')) {
       // It's a free tier or somehow instantly succeeded, no frontend checkout needed
       return NextResponse.json({ upgraded: true });
    }

    if (!paymentIntent?.client_secret) {
      return NextResponse.json({ error: "Could not create payment intent for subscription" }, { status: 500 });
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      subscriptionId: subscription.id,
      tierName: tier.name,
      tierPrice: tier.price,
    });
  } catch (error: any) {
    console.error("Stripe Subscribe Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to initiate subscription" },
      { status: 500 }
    );
  }
}
