import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { headers } from "next/headers";
import { auditLog } from "@/lib/audit-log";
import { sendEmail } from "@/lib/email";

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

    // 🔒 Idempotency Check
    const eventId = event.id;
    const isProcessed = await prisma.processedStripeEvent.findUnique({
      where: { stripeEventId: eventId }
    });

    if (isProcessed) {
      console.log(`[Webhook] Event ${eventId} was already processed. Ignoring.`);
      return NextResponse.json({ received: true, ignored: "Already processed event" });
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

        const adminFee = pi.metadata.adminFee ? parseFloat(pi.metadata.adminFee) : 0;
        const netToOwner = pi.metadata.netToOwner ? parseFloat(pi.metadata.netToOwner) : 0;
        const grossPaid = pi.metadata.grossPaid ? parseFloat(pi.metadata.grossPaid) : 0;
        const processingFee = pi.metadata.processingFee ? parseFloat(pi.metadata.processingFee) : 0;

        await prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            status: "PAID",
            paymentMethod: "STRIPE",
            adminFee,
            netToOwner,
            grossPaid,
            processingFee,
          },
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

          if (!userId || !tierId) {
            console.warn("[Webhook] Missing userId or tierId in checkout session metadata");
            break;
          }

          const tier = await prisma.pricingTier.findUnique({
            where: { id: tierId }
          });

          await prisma.user.update({
            where: { id: userId },
            data: {
              stripeSubscriptionId: subscriptionId,
              currentTierId: tierId,
              subscriptionStatus: "Active",
            },
          });

          await prisma.subscriptionHistory.create({
            data: {
              userId,
              toTierId: tierId,
              toTierName: tier?.name || "Unknown Plan",
              event: "SUBSCRIBED",
              amountPaid: session.amount_total ? session.amount_total / 100 : null,
            }
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
        break;
      }
      
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as any;
        if (invoice.subscription) {
          const subscriptionId = invoice.subscription as string;
          let tierId: string | null = null;
          try {
            const sub = await stripe.subscriptions.retrieve(subscriptionId);
            tierId = sub.metadata?.tierId || null;
          } catch (e: any) {
            console.warn("[Webhook] Stripe sub retrieve warning:", e?.message);
          }

          const matchingUsers = await prisma.user.findMany({
            where: { stripeSubscriptionId: subscriptionId },
            select: { id: true, subscriptionStatus: true }
          });

          for (const u of matchingUsers) {
            const isReactivation = u.subscriptionStatus === "Past_Due" || u.subscriptionStatus === "Inactive" || u.subscriptionStatus === "Paused";
            
            const updateData: any = {
              subscriptionStatus: "Active",
              gracePeriodEnd: null,
              pausedAt: null,
              payoutsBlockedAt: null,
              accessGrantedByAdmin: false,
              accessGrantedExpiresAt: null,
            };
            if (tierId) {
              updateData.currentTierId = tierId;
            }

            await prisma.user.update({
              where: { id: u.id },
              data: updateData,
            });

            // Quota check for upsell warning/notification
            try {
              const unitCount = await prisma.unit.count({
                where: { property: { ownerId: u.id } }
              });
              const tier = tierId ? await prisma.pricingTier.findUnique({ where: { id: tierId } }) : null;
              if (tier && tier.maxUnits > 0) {
                const usagePercent = (unitCount / tier.maxUnits) * 100;
                if (usagePercent >= 80) {
                  await prisma.notification.create({
                    data: {
                      userId: u.id,
                      title: "🚀 Approaching Plan Capacity",
                      message: `You have registered ${unitCount} of ${tier.maxUnits} units allowed on your ${tier.name} plan (${Math.round(usagePercent)}% capacity). Consider upgrading to a higher plan to add more properties.`,
                      type: "SYSTEM",
                      priority: "MEDIUM",
                    }
                  });
                }
              }
            } catch (quotaErr) {
              console.error("[Webhook] Quota check failed:", quotaErr);
            }

            if (isReactivation) {
              const tier = tierId ? await prisma.pricingTier.findUnique({ where: { id: tierId } }) : null;
              await prisma.subscriptionHistory.create({
                data: {
                  userId: u.id,
                  toTierId: tierId,
                  toTierName: tier?.name || "Unknown Plan",
                  event: "REACTIVATED",
                  amountPaid: invoice.amount_paid ? invoice.amount_paid / 100 : null,
                  stripeInvoiceId: invoice.id,
                }
              });
            }
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        if (invoice.subscription) {
          const subscriptionId = invoice.subscription as string;
          const billingReason = invoice.billing_reason;
          const isFirstTrialCharge = billingReason === "subscription_cycle" && invoice.collection_method === "charge_automatically";

          const matchedUsers = await prisma.user.findMany({
            where: { stripeSubscriptionId: subscriptionId },
            select: { id: true, subscriptionStatus: true, gracePeriodEnd: true, email: true, name: true, currentTierId: true }
          });

          const settings = await prisma.platformSettings.findFirst();
          const graceDays = settings?.gracePeriodDays ?? 7;
          const blockPayouts = settings?.blockPayoutsOnPastDue ?? true;

          for (const u of matchedUsers) {
            const shouldSetGrace = !u.gracePeriodEnd;
            const newGraceEnd = shouldSetGrace
              ? new Date(Date.now() + graceDays * 86400000)
              : u.gracePeriodEnd;

            await prisma.user.update({
              where: { id: u.id },
              data: {
                subscriptionStatus: "Past_Due",
                ...(shouldSetGrace ? {
                  gracePeriodEnd: newGraceEnd,
                  payoutsBlockedAt: blockPayouts ? new Date() : null,
                } : {}),
              }
            });

            // Write to SubscriptionHistory
            const tier = u.currentTierId ? await prisma.pricingTier.findUnique({ where: { id: u.currentTierId } }) : null;
            await prisma.subscriptionHistory.create({
              data: {
                userId: u.id,
                toTierId: u.currentTierId,
                toTierName: tier?.name || "Unknown Plan",
                event: "PAST_DUE",
                stripeInvoiceId: invoice.id,
              }
            });

            // Notify matching users
            const isTrialEndFailure = isFirstTrialCharge && u.subscriptionStatus === "Trialing";
            const graceEndFormatted = newGraceEnd ? new Date(newGraceEnd).toLocaleDateString("en-US", {
              month: "long", day: "numeric", year: "numeric"
            }) : "soon";

            await prisma.notification.create({
              data: {
                userId: u.id,
                title: isTrialEndFailure ? "⚠️ Trial Ended - Payment Required" : "⚠️ Subscription Payment Failed",
                message: `Please update your payment method. Access pauses on ${graceEndFormatted}.`,
                type: "PAYMENT",
                priority: "HIGH",
                isRead: false,
              },
            });

            if (u.email) {
              const emailSubject = isTrialEndFailure
                ? "⚠️ Your PropertyPro Trial Has Ended - Payment Required"
                : "⚠️ Action Required: Subscription Payment Failed - PropertyPro";

              const emailIntro = isTrialEndFailure
                ? `Your free trial on the <strong>${tier?.name || "Starter"}</strong> plan has ended. We tried to process your first payment of <strong>$${tier?.price || "29"}/month</strong> but the charge failed.`
                : `We were unable to process your recurring subscription payment for PropertyPro.`;

              await sendEmail({
                to: u.email,
                subject: emailSubject,
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #e11d48;">${isTrialEndFailure ? "Trial Ended - Payment Failed" : "Payment Failed"}</h2>
                    <p>Hi ${u.name || 'Owner'},</p>
                    <p>${emailIntro}</p>
                    <p>Your subscription is currently marked as <strong>Past Due</strong>. Please update your payment method by <strong>${graceEndFormatted}</strong> to ensure uninterrupted access to your properties and management tools.</p>
                    <div style="margin: 24px 0;">
                      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/owner/billing" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Update Payment Method</a>
                    </div>
                  </div>
                `
              });
            }
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Find users matching subscription
        const users = await prisma.user.findMany({
          where: { stripeSubscriptionId: subscription.id },
          include: { ownedProperties: { include: { units: true } }, pricingTier: true }
        });

        for (const u of users) {
          const unitCount = u.ownedProperties.reduce((acc, p) => acc + p.units.length, 0);

          const hobbyistTier = await prisma.pricingTier.findFirst({
            where: { price: 0 }
          });

          await prisma.user.update({
            where: { id: u.id },
            data: {
              subscriptionStatus: "Paused",
              pausedAt: new Date(),
              payoutsBlockedAt: new Date(),
              gracePeriodEnd: null,
              ...(hobbyistTier ? { currentTierId: hobbyistTier.id } : {}),
            },
          });

          await prisma.subscriptionHistory.create({
            data: {
              userId: u.id,
              fromTierId: u.currentTierId,
              fromTierName: u.pricingTier?.name || "Unknown Plan",
              event: "PAUSED",
            }
          });

          await prisma.notification.create({
            data: {
              userId: u.id,
              title: "⏸ Account Paused - Your Data is Safe",
              message: `Your subscription has lapsed. Your ${unitCount} unit${unitCount !== 1 ? "s" : ""}, all leases, and tenant data are fully preserved. New unit creation and payouts are paused. Resubscribe to restore full access.`,
              type: "SYSTEM",
              priority: "HIGH",
            }
          });

          if (u.email) {
            await sendEmail({
              to: u.email,
              subject: "Your PropertyPro Account is Paused",
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                  <h2 style="color: #d97706;">Account Paused</h2>
                  <p>Hi ${u.name || 'Owner'},</p>
                  <p>Your subscription to PropertyPro has ended. Your portfolio is safe, and we have preserved all <strong>${unitCount}</strong> units and active tenant data.</p>
                  <p>To comply with plan limits, new property and unit creation is locked, and payouts are temporarily paused. Resubscribe or update payment details to instantly reactivate your account.</p>
                  <div style="margin: 24px 0;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/owner/billing" style="background-color: #d97706; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Reactivate Subscription</a>
                  </div>
                </div>
              `
            });
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        let newStatus = "Active";

        if (subscription.status === 'trialing') {
          newStatus = "Trialing";
        } else if (subscription.cancel_at_period_end) {
          newStatus = "Active (Canceling)";
        } else if (subscription.status === 'past_due') {
          newStatus = "Past_Due";
        } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
          newStatus = "Inactive";
        } else if (subscription.status === 'active') {
          newStatus = "Active";
        }

        // Tier sync: find matching pricing tier from sub item price if available
        let matchingTierId: string | undefined = undefined;
        const priceId = subscription.items?.data?.[0]?.price?.id;
        const metadataTierId = subscription.metadata?.tierId;

        if (metadataTierId) {
          matchingTierId = metadataTierId;
        } else if (priceId) {
          const tier = await prisma.pricingTier.findFirst({
            where: { stripePriceId: priceId }
          });
          if (tier) matchingTierId = tier.id;
        }

        const matchingUsers = await prisma.user.findMany({
          where: { stripeSubscriptionId: subscription.id },
          select: { id: true, currentTierId: true, subscriptionStatus: true }
        });

        const prevStatus = (event.data as any).previous_attributes?.status;

        for (const u of matchingUsers) {
          const hasTierChanged = matchingTierId && u.currentTierId !== matchingTierId;

          const updateData: any = { subscriptionStatus: newStatus };
          if (matchingTierId) {
            updateData.currentTierId = matchingTierId;
          }

          // Clear grace/pause fields on active statuses
          if (newStatus === "Active" || newStatus === "Active (Canceling)") {
            updateData.gracePeriodEnd = null;
            updateData.pausedAt = null;
            updateData.payoutsBlockedAt = null;
            updateData.accessGrantedByAdmin = false;
            updateData.accessGrantedExpiresAt = null;
          }

          await prisma.user.update({
            where: { id: u.id },
            data: updateData,
          });

          // Log TRIAL_CONVERTED if trial successfully converted to active paid status
          if (prevStatus === "trialing" && subscription.status === "active") {
            const tier = matchingTierId ? await prisma.pricingTier.findUnique({ where: { id: matchingTierId } }) : null;
            await prisma.subscriptionHistory.create({
              data: {
                userId: u.id,
                toTierId: matchingTierId,
                toTierName: tier?.name || "Starter",
                event: "TRIAL_CONVERTED",
                amountPaid: subscription.items?.data?.[0]?.price?.unit_amount ? subscription.items.data[0].price.unit_amount / 100 : null,
              }
            });
          }

          if (hasTierChanged && matchingTierId) {
            const oldTier = u.currentTierId ? await prisma.pricingTier.findUnique({ where: { id: u.currentTierId } }) : null;
            const newTier = await prisma.pricingTier.findUnique({ where: { id: matchingTierId } });

            let event = "SUBSCRIBED";
            if (oldTier && newTier) {
              event = newTier.price > oldTier.price ? "UPGRADED" : "DOWNGRADED";
            }

            await prisma.subscriptionHistory.create({
              data: {
                userId: u.id,
                fromTierId: u.currentTierId,
                fromTierName: oldTier?.name || null,
                toTierId: matchingTierId,
                toTierName: newTier?.name || "Unknown Plan",
                event,
              }
            });
          }
        }
        break;
      }

      case "customer.subscription.trial_will_end": {
        const subscription = event.data.object as Stripe.Subscription;
        const users = await prisma.user.findMany({
          where: { stripeSubscriptionId: subscription.id },
          select: { id: true, email: true, name: true }
        });

        const trialEndDate = new Date(subscription.trial_end! * 1000).toLocaleDateString("en-US", {
          month: "long", day: "numeric"
        });
        const chargeAmount = subscription.items.data[0]?.price?.unit_amount ?? 0;

        for (const user of users) {
          await prisma.notification.create({
            data: {
              userId: user.id,
              title: "Trial Period Ending Soon",
              message: `Your subscription trial will end on ${trialEndDate}. Make sure your payment details are up to date.`,
              type: "SYSTEM",
              priority: "MEDIUM",
            }
          });

          if (user.email) {
            await sendEmail({
              to: user.email,
              subject: `Your PropertyPro trial ends ${trialEndDate} - Here's what happens next`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                  <h2>Your Free Trial is Ending</h2>
                  <p>Hi ${user.name || 'Owner'},</p>
                  <p>Your free trial period ends on <strong>${trialEndDate}</strong>. At that time, Stripe will process your first charge of <strong>$${(chargeAmount / 100).toFixed(2)}</strong>.</p>
                  <p>Please check your payment method on file to ensure uninterrupted service.</p>
                  <div style="margin: 24px 0;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/owner/billing" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Update Billing Settings</a>
                  </div>
                </div>
              `
            });
          }
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

    // Save to ProcessedStripeEvent to guarantee idempotency
    try {
      await prisma.processedStripeEvent.create({
        data: { stripeEventId: eventId }
      });
    } catch (e) {
      console.error(`[Webhook] Duplicate insertion error for event ${eventId}:`, e);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Stripe Webhook Processing Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
