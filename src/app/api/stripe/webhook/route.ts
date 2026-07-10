import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { headers } from "next/headers";
import { auditLog } from "@/lib/audit-log";

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
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const { invoiceId, tenantId, category } = pi.metadata || {};

        if (!invoiceId || !tenantId) break;

        // Update the invoice to PAID
        const invoice = await prisma.invoice.findUnique({
          where: { id: invoiceId },
          include: {
            lease: {
              include: { unit: { include: { property: true } } },
            },
          },
        });

        if (!invoice || invoice.status === "PAID") break;

        await prisma.invoice.update({
          where: { id: invoiceId },
          data: { status: "PAID", paymentMethod: "STRIPE" },
        });

        await auditLog({
          entityType: "INVOICE",
          entityId: invoiceId,
          action: "STATUS_CHANGED",
          actorId: tenantId,
          actorRole: "TENANT",
          oldValue: { status: invoice.status },
          newValue: { status: "PAID", paymentMethod: "STRIPE" },
          note: `Stripe PaymentIntent ${pi.id} succeeded. Invoice marked as PAID.`,
        });

        // Increment owner balance (net of platform fee)
        const netToOwner = Number(pi.metadata.netToOwner || 0);
        if (netToOwner > 0 && invoice.lease.unit.property.ownerId) {
          await prisma.user.update({
            where: { id: invoice.lease.unit.property.ownerId },
            data: { balance: { increment: netToOwner } },
          });
        }

        // If this was a DEPOSIT payment, update the lease deposit fields
        if (category === "DEPOSIT") {
          const paidAmount = pi.amount_received / 100; // cents -> dollars
          await prisma.lease.update({
            where: { id: invoice.leaseId },
            data: {
              depositPaidAt: new Date(),
              depositPaidAmount: paidAmount,
              depositBalance: paidAmount,
              depositStatus: "HELD",
              depositTransactionId: pi.id,
            } as any,
          });

          // Notify tenant
          await prisma.notification.create({
            data: {
              userId: tenantId,
              title: "Security Deposit Confirmed ✅",
              message: `Your security deposit of $${paidAmount.toFixed(2)} has been received and is now held in escrow. You are now ready to sign your lease.`,
              type: "PAYMENT",
              priority: "HIGH",
              isRead: false,
            },
          });

          // Notify owner
          await prisma.notification.create({
            data: {
              userId: invoice.lease.unit.property.ownerId,
              title: "Tenant Deposit Received",
              message: `The security deposit of $${paidAmount.toFixed(2)} for Unit ${invoice.lease.unit.name} has been confirmed via Stripe.`,
              type: "PAYMENT",
              priority: "MEDIUM",
              isRead: false,
            },
          });
        }

        // Record transaction in ledger
        await prisma.transaction.create({
          data: {
            type: "INCOME",
            category: category === "DEPOSIT" ? "DEPOSIT" : "RENT",
            amount: pi.amount_received / 100,
            reference: `STRIPE_PI_${pi.id.slice(-8)}`,
            tenantId,
            status: "COMPLETED",
          },
        });

        break;
      }

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

            await auditLog({
              entityType: "USER",
              entityId: userId,
              action: "UPDATED",
              actorId: userId,
              actorRole: "OWNER",
              newValue: { currentTierId: tierId, subscriptionStatus: "Active" },
              note: `Stripe subscription checkout succeeded. Subscription activated.`,
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

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const piId = charge.payment_intent as string;

        if (piId) {
          try {
            const pi = await stripe.paymentIntents.retrieve(piId);
            const { invoiceId, tenantId } = pi.metadata || {};

            if (invoiceId) {
              const invoice = await prisma.invoice.findUnique({
                where: { id: invoiceId },
                include: {
                  lease: {
                    include: { unit: { include: { property: true } } },
                  },
                },
              });

              if (invoice) {
                // Update invoice status to REFUNDED
                await prisma.invoice.update({
                  where: { id: invoiceId },
                  data: { status: "REFUNDED" },
                });

                // Decrement owner balance by the netToOwner amount previously credited
                const netToOwner = Number(pi.metadata.netToOwner || 0);
                if (netToOwner > 0 && invoice.lease.unit.property.ownerId) {
                  await prisma.user.update({
                    where: { id: invoice.lease.unit.property.ownerId },
                    data: { balance: { decrement: netToOwner } },
                  });
                }

                // Create expense transaction for ledger tracking
                await prisma.transaction.create({
                  data: {
                    type: "EXPENSE",
                    category: "OTHER",
                    amount: charge.amount_refunded / 100, // cents to dollars
                    reference: `STRIPE_REFUND_${charge.id.slice(-8)}`,
                    tenantId: tenantId || null,
                    status: "COMPLETED",
                    invoiceId: invoiceId,
                  },
                });

                await auditLog({
                  entityType: "INVOICE",
                  entityId: invoiceId,
                  action: "STATUS_CHANGED",
                  actorId: tenantId || null,
                  actorRole: "SYSTEM",
                  oldValue: { status: invoice.status },
                  newValue: { status: "REFUNDED" },
                  note: `Stripe Charge ${charge.id} was refunded. Invoice status updated to REFUNDED. Balance adjusted for owner.`,
                });
              }
            }
          } catch (err) {
            console.error("Error processing charge.refunded event:", err);
          }
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
