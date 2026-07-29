import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import Stripe from "stripe";

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

    const stripe = getStripe();
    if (!stripe) throw new Error("Stripe not initialized");

    const customerId = user.stripeCustomerId;
    const subscriptionId = user.stripeSubscriptionId;

    if (!customerId || !subscriptionId) {
      return NextResponse.json({ 
        error: "Active subscription is required to generate a proration preview." 
      }, { status: 400 });
    }

    // Retrieve active subscription details
    let existingSub: Stripe.Subscription;
    try {
      existingSub = await stripe.subscriptions.retrieve(subscriptionId);
    } catch (err: any) {
      return NextResponse.json({ error: "Could not retrieve your current Stripe subscription." }, { status: 400 });
    }

    // Resolve Price ID
    let priceId: string;
    const existingPrices = await stripe.prices.list({
      active: true,
      lookup_keys: [`tier_${tierId}`],
    });

    if (existingPrices.data.length > 0) {
      priceId = existingPrices.data[0].id;
    } else {
      // Create price dynamically if it doesn't exist
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

    // Fetch upcoming invoice preview from Stripe
    let upcomingInvoice: Stripe.Invoice;
    try {
      upcomingInvoice = await stripe.invoices.createPreview({
        customer: customerId,
        subscription: subscriptionId,
        subscription_details: {
          items: [
            {
              id: existingSub.items.data[0].id,
              price: priceId,
            },
          ],
          proration_behavior: "always_invoice",
        },
      });
    } catch (err: any) {
      return NextResponse.json({ 
        error: err.message || "Failed to calculate subscription upgrade proration details." 
      }, { status: 400 });
    }

    // Get default payment method card details
    let cardBrand = "card";
    let cardLast4 = "";
    
    try {
      const stripeCustomer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
      const defaultPmId = stripeCustomer.invoice_settings?.default_payment_method as string || (existingSub as any).default_payment_method as string;
      
      if (defaultPmId) {
        const pm = await stripe.paymentMethods.retrieve(defaultPmId);
        if (pm.card) {
          cardBrand = pm.card.brand;
          cardLast4 = pm.card.last4;
        }
      } else if (user.cardBrand && user.cardLast4) {
        cardBrand = user.cardBrand;
        cardLast4 = user.cardLast4;
      }
    } catch (e) {
      // Fallback to db card metadata
      if (user.cardBrand && user.cardLast4) {
        cardBrand = user.cardBrand;
        cardLast4 = user.cardLast4;
      }
    }

    const amountDue = upcomingInvoice.amount_due / 100;
    const subtotal = upcomingInvoice.subtotal / 100;
    const nextBillingDate = upcomingInvoice.next_payment_attempt;

    return NextResponse.json({
      amountDue,
      subtotal,
      nextBillingDate,
      cardBrand,
      cardLast4,
      targetTierName: tier.name,
      targetTierPrice: tier.price,
    });
  } catch (error: any) {
    console.error("Stripe Preview Upgrade Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate plan change preview" },
      { status: 500 }
    );
  }
}
