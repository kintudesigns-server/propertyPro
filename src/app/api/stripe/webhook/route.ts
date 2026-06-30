import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    if (!signature) {
      throw new Error("Missing stripe-signature header");
    }
    // Verify signature
    // For local testing without webhook secret, we can skip signature check in dev mode if STRIPE_WEBHOOK_SECRET is missing.
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (process.env.NODE_ENV === "production" && !webhookSecret) {
      throw new Error("Missing STRIPE_WEBHOOK_SECRET in production environment");
    }
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      // Direct parsing for test environment when webhook secret is not set
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err: any) {
    console.error(`Webhook signature verification failed:`, err.message);
    return NextResponse.json({ error: "Webhook Error" }, { status: 400 });
  }

  // Handle the event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const invoiceId = session.metadata?.invoiceId;

    if (invoiceId) {
      console.log(`Processing invoice ${invoiceId} payment...`);
      try {
        const invoice = await prisma.invoice.findUnique({
          where: { id: invoiceId },
          include: {
            lease: {
              include: {
                unit: {
                  include: {
                    property: true,
                  },
                },
              },
            },
          },
        });

        if (invoice && invoice.status !== "PAID") {
          // 1. Mark Invoice as PAID
          await prisma.invoice.update({
            where: { id: invoiceId },
            data: {
              status: "PAID",
              paymentMethod: "STRIPE",
            },
          });

          // 2. Credit Owner ledger balance
          const ownerId = invoice.lease.unit.property.ownerId;
          const rentPaidAmount = Number(invoice.amount);

          await prisma.user.update({
            where: { id: ownerId },
            data: {
              balance: {
                increment: rentPaidAmount,
              },
            },
          });

          // 3. Create Transaction record for Tenant
          await prisma.transaction.create({
            data: {
              type: "INCOME",
              category: "RENT",
              amount: invoice.amount,
              reference: `STRIPE_${session.id.slice(-12)}`,
              status: "COMPLETED",
              tenantId: invoice.lease.tenantId,
            },
          });

          console.log(`Credited Landlord ${ownerId} with $${rentPaidAmount} rent.`);
        }
      } catch (error) {
        console.error("Error updating ledger balance on webhook:", error);
        return NextResponse.json({ error: "Database update error" }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
