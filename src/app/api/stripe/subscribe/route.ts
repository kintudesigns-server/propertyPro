import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import Stripe from "stripe";

// POST /api/stripe/subscribe
// Creates a Stripe SetupIntent + returns client_secret for embedded Stripe Elements.
// After payment method is confirmed on client, a subscription is created via webhook.
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tierId, confirm } = await req.json();
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
      let existingSub: Stripe.Subscription;
      try {
        existingSub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      } catch (err: any) {
        // Sub no longer exists in Stripe (API key swap, etc.) — fall through to create new
        existingSub = { status: "canceled" } as any;
      }
      
      if (existingSub.status === "active" || existingSub.status === "trialing") {
        if (user.pricingTier?.id === tierId) {
          return NextResponse.json({
            error: "You are already subscribed to this plan.",
            alreadySubscribed: true,
          }, { status: 400 });
        }

        // Downgrade check
        const isDowngrade = user.pricingTier ? (tier.price < user.pricingTier.price) : false;
        if (isDowngrade && !confirm) {
          return NextResponse.json({
            requiresConfirmation: true,
            currentTierName: user.pricingTier?.name,
            targetTierName: tier.name,
            currentPrice: user.pricingTier?.price,
            targetPrice: tier.price,
          });
        }

        if (isDowngrade && confirm) {
          // Case 1: Downgrade to Free Hobbyist ($0)
          if (tier.price === 0) {
            await stripe.subscriptions.update(user.stripeSubscriptionId, {
              cancel_at_period_end: true,
            });
            await prisma.user.update({
              where: { id: user.id },
              data: {
                subscriptionStatus: "Active (Canceling)",
              },
            });
            return NextResponse.json({ upgraded: true, scheduledCancel: true });
          }

          // Case 2: Downgrade to a paid tier (Starter etc.)
          const updatedSub = await stripe.subscriptions.update(user.stripeSubscriptionId, {
            items: [{ id: existingSub.items.data[0].id, price: priceId }],
            proration_behavior: "none",
          });
          await prisma.user.update({
            where: { id: user.id },
            data: {
              currentTierId: tier.id,
              subscriptionStatus: "Active",
            },
          });
          return NextResponse.json({ upgraded: true });
        }

        // Check if the customer already has a default payment method
        const stripeCustomer = await stripe.customers.retrieve(customerId!) as Stripe.Customer;
        const hasDefaultPaymentMethod = !!(
          stripeCustomer.invoice_settings?.default_payment_method ||
          (stripeCustomer as any).default_source
        );

        // Also check subscription-level default payment method
        const subDefaultPm = (existingSub as any).default_payment_method;
        const hasPaymentMethod = hasDefaultPaymentMethod || !!subDefaultPm;

        if (!hasPaymentMethod && Number(tier.price) > 0) {
          // No card on file → collect card first via SetupIntent, then apply upgrade after confirmation
          const setupIntent = await stripe.setupIntents.create({
            customer: customerId!,
            payment_method_types: ["card"],
            metadata: {
              userId: user.id,
              tierId: tier.id,
              upgradeFromSubId: user.stripeSubscriptionId,
            },
          });
          return NextResponse.json({
            setupClientSecret: setupIntent.client_secret,
            tierName: tier.name,
            tierPrice: tier.price,
            requiresSetup: true,
          });
        }

        // Update the existing subscription
        const updatedSub = await stripe.subscriptions.update(user.stripeSubscriptionId, {
          items: [{ id: existingSub.items.data[0].id, price: priceId }],
          proration_behavior: 'always_invoice',
          payment_behavior: 'pending_if_incomplete',
          expand: ['latest_invoice.payment_intent'],
        });

        const invoice = updatedSub.latest_invoice as any;
        const paymentIntent = invoice?.payment_intent as any;

        // If payment needs action (3DS etc.)
        if (paymentIntent && (paymentIntent.status === 'requires_payment_method' || paymentIntent.status === 'requires_action')) {
          return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
            subscriptionId: updatedSub.id,
            tierName: tier.name,
            tierPrice: tier.price,
          });
        }

        // Successfully upgraded immediately
        await prisma.user.update({
          where: { id: user.id },
          data: { 
            currentTierId: tier.id,
            subscriptionStatus: "Active"
          },
        });

        return NextResponse.json({ 
          upgraded: true, 
          proratedAmount: invoice ? invoice.amount_due / 100 : 0 
        });
      }
    }

    // Build Stripe subscription request options
    const subscriptionOptions: Stripe.SubscriptionCreateParams = {
      customer: customerId,
      items: [{ price: priceId }],
      metadata: {
        userId: user.id,
        tierId: tier.id,
      },
    };

    const hasPreviouslyPaid = user.pricingTier && Number(user.pricingTier.price) > 0;
    const hasEverHadSubscription = !!user.stripeSubscriptionId;
    const hasUsedAnyTrial = user.trialUsedTierIds && user.trialUsedTierIds.length > 0;

    const isTrialEligible = !hasPreviouslyPaid && !hasEverHadSubscription && !hasUsedAnyTrial;
    const isTrial = tier.trialDays && Number(tier.trialDays) > 0 && isTrialEligible;

    // Check if we need to collect card payment via Checkout Session
    if (Number(tier.price) > 0 && !isTrial) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        customer: customerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        metadata: {
          userId: user.id,
          tierId: tier.id,
        },
        subscription_data: {
          metadata: {
            userId: user.id,
            tierId: tier.id,
          },
        },
        success_url: `${appUrl}/dashboard/owner/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/dashboard/owner/billing?checkout=cancelled`,
      });

      return NextResponse.json({ url: checkoutSession.url });
    }

    if (isTrial) {
      subscriptionOptions.trial_period_days = Number(tier.trialDays);
    } else {
      subscriptionOptions.payment_behavior = "default_incomplete";
      subscriptionOptions.payment_settings = { save_default_payment_method: "on_subscription" };
      subscriptionOptions.expand = ["latest_invoice.payment_intent"];
    }

    const subscription = await stripe.subscriptions.create(subscriptionOptions);

    const invoice = subscription.latest_invoice as any;
    const paymentIntent = invoice?.payment_intent as any;

    // Store the subscription ID on the user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        stripeSubscriptionId: subscription.id,
        ...(isTrial ? {
          trialUsedTierIds: {
            push: tier.id,
          }
        } : {}),
        ...(Number(tier.price) === 0 || isTrial ? {
          currentTierId: tier.id,
          subscriptionStatus: isTrial ? "Trialing" : "Active",
          gracePeriodEnd: null,
          pausedAt: null,
          payoutsBlockedAt: null,
        } : {}),
      },
    });

    if (Number(tier.price) === 0 || isTrial || (paymentIntent && paymentIntent.status === 'succeeded')) {
       // If it instantly succeeded and it wasn't a free/trial tier, write currentTierId and subscriptionStatus active now
       if (Number(tier.price) > 0 && !isTrial) {
         await prisma.user.update({
           where: { id: user.id },
           data: {
             currentTierId: tier.id,
             subscriptionStatus: "Active",
             gracePeriodEnd: null,
             pausedAt: null,
             payoutsBlockedAt: null,
             accessGrantedByAdmin: false,
             accessGrantedExpiresAt: null,
           },
         });
       }
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
