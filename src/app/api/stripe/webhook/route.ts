import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { headers } from "next/headers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-04-10" as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature") as string;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription") {
          const userId = session.metadata?.userId;
          const tierId = session.metadata?.tierId;
          const subscriptionId = session.subscription as string;

          if (userId && tierId && subscriptionId) {
            await prisma.user.update({
              where: { id: userId },
              data: {
                stripeSubscriptionId: subscriptionId,
                currentTierId: tierId,
                subscriptionStatus: "Active",
              },
            });
          }
        }
        break;
      }
      
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as any;
        if (invoice.subscription) {
          const subscriptionId = invoice.subscription as string;
          await prisma.user.updateMany({
            where: { stripeSubscriptionId: subscriptionId },
            data: { subscriptionStatus: "Active" },
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        if (invoice.subscription) {
          const subscriptionId = invoice.subscription as string;
          // Grace period kicks in - marked as Past Due
          await prisma.user.updateMany({
            where: { stripeSubscriptionId: subscriptionId },
            data: { subscriptionStatus: "Past_Due" },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        // Lockout kicks in
        await prisma.user.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: { subscriptionStatus: "Inactive" },
        });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        // Check for "cancel_at_period_end" for Graceful Cancellations
        if (subscription.cancel_at_period_end) {
          await prisma.user.updateMany({
            where: { stripeSubscriptionId: subscription.id },
            data: { subscriptionStatus: "Active (Canceling)" },
          });
        } else if (subscription.status === 'active' || subscription.status === 'trialing') {
           await prisma.user.updateMany({
            where: { stripeSubscriptionId: subscription.id },
            data: { subscriptionStatus: "Active" },
          });
        }
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Stripe Webhook Processing Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
