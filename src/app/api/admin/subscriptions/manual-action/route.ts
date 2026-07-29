import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { auditLog } from "@/lib/audit-log";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminId = (session.user as any).id;

  try {
    const { action, userId, days, grantDays, reason } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { pricingTier: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const stripe = getStripe();

    switch (action) {
      case "extend_grace": {
        const graceDays = Number(days || 7);
        const newGraceEnd = new Date(Date.now() + graceDays * 86400000);

        if (user.stripeSubscriptionId && stripe) {
          try {
            const stripeSub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
            if (stripeSub.status === "past_due") {
              await stripe.subscriptions.update(user.stripeSubscriptionId, {
                trial_end: Math.floor(newGraceEnd.getTime() / 1000),
                proration_behavior: "none",
              });
            }
          } catch (stripeErr: any) {
            console.warn("Stripe extend grace error:", stripeErr?.message);
          }
        }

        await prisma.user.update({
          where: { id: userId },
          data: {
            gracePeriodEnd: newGraceEnd,
            subscriptionStatus: "Past_Due",
          }
        });

        await auditLog({
          entityType: "USER",
          entityId: userId,
          action: "UPDATED",
          actorId: adminId,
          actorRole: "SUPERADMIN",
          note: `Admin extended grace period by ${graceDays} days until ${newGraceEnd.toLocaleDateString()}`,
        });

        // Notify user
        await prisma.notification.create({
          data: {
            userId,
            title: "⏳ Grace Period Extended",
            message: `Your payment grace period has been extended until ${newGraceEnd.toLocaleDateString()}. Please update your payment details.`,
            type: "SYSTEM",
            priority: "HIGH",
          }
        });

        if (user.email) {
          await sendEmail({
            to: user.email,
            subject: "Your Payment Grace Period Has Been Extended",
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2>Grace Period Extended</h2>
                <p>Hi ${user.name || 'Owner'},</p>
                <p>An administrator has extended your payment grace period. You will have full access to PropertyPro until <strong>${newGraceEnd.toLocaleDateString()}</strong>.</p>
                <p>Please update your billing details on file before this date to prevent interruption.</p>
                <div style="margin: 24px 0;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/owner/billing" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Update Payment Method</a>
                </div>
              </div>
            `
          });
        }

        return NextResponse.json({ success: true, gracePeriodEnd: newGraceEnd });
      }

      case "restore_access": {
        const adminReason = reason || "Admin manual restoration of account access";
        if (adminReason.trim().length < 10) {
          return NextResponse.json({ error: "A valid reason of at least 10 characters is required." }, { status: 400 });
        }

        const stripeSub = (user.stripeSubscriptionId && stripe)
          ? await stripe.subscriptions.retrieve(user.stripeSubscriptionId).catch(() => null)
          : null;

        let compedExpiresAt = null;

        if (stripeSub && stripeSub.status === "past_due") {
          // Stripe sub exists and is past_due — force trial_end to end now
          try {
            await stripe!.subscriptions.update(user.stripeSubscriptionId!, {
              trial_end: "now",
              proration_behavior: "none",
              payment_behavior: "allow_incomplete",
            });
          } catch (stripeErr: any) {
            console.warn("Stripe restore error:", stripeErr?.message);
          }

          await prisma.user.update({
            where: { id: userId },
            data: {
              subscriptionStatus: "Active",
              pausedAt: null,
              payoutsBlockedAt: null,
              gracePeriodEnd: null,
              accessGrantedByAdmin: false,
              accessGrantedExpiresAt: null,
            }
          });
        } else {
          // Stripe sub is canceled or missing — grant comped access
          const grantDaysCount = Number(grantDays || 30);
          compedExpiresAt = new Date(Date.now() + grantDaysCount * 86400000);

          await prisma.user.update({
            where: { id: userId },
            data: {
              subscriptionStatus: "Active",
              accessGrantedByAdmin: true,
              accessGrantedExpiresAt: compedExpiresAt,
              pausedAt: null,
              payoutsBlockedAt: null,
              gracePeriodEnd: null,
            }
          });

          await prisma.subscriptionOverride.upsert({
            where: { userId },
            create: {
              userId,
              manualRestored: true,
              adminId,
              reason: adminReason,
              expiresAt: compedExpiresAt,
            },
            update: {
              manualRestored: true,
              adminId,
              reason: adminReason,
              expiresAt: compedExpiresAt,
            }
          });
        }

        await auditLog({
          entityType: "USER",
          entityId: userId,
          action: "UPDATED",
          actorId: adminId,
          actorRole: "SUPERADMIN",
          note: `Admin manually restored access. Reason: ${adminReason}. ${compedExpiresAt ? `Comped expiry: ${compedExpiresAt.toLocaleDateString()}` : "Stripe sub active."}`,
        });

        // Notify user
        await prisma.notification.create({
          data: {
            userId,
            title: "✅ Account Re-activated",
            message: `Your account access has been manually restored by an administrator${compedExpiresAt ? ` until ${compedExpiresAt.toLocaleDateString()}` : ""}.`,
            type: "SYSTEM",
            priority: "HIGH",
          }
        });

        if (user.email) {
          await sendEmail({
            to: user.email,
            subject: "Your PropertyPro Access Has Been Restored",
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #10b981;">Access Restored</h2>
                <p>Hi ${user.name || 'Owner'},</p>
                <p>We are pleased to inform you that an administrator has manually restored full access to your PropertyPro account.</p>
                ${compedExpiresAt ? `<p>This temporary access is granted until <strong>${compedExpiresAt.toLocaleDateString()}</strong>. Please set up a billing plan before then to remain active.</p>` : "<p>Your subscription is active again.</p>"}
                <div style="margin: 24px 0;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/owner/billing" style="background-color: #10b981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Manage Billing</a>
                </div>
              </div>
            `
          });
        }

        return NextResponse.json({ success: true, compedExpiresAt });
      }

      case "manual_pause": {
        const adminReason = reason || "Suspended by admin";
        if (adminReason.trim().length < 10) {
          return NextResponse.json({ error: "A valid reason of at least 10 characters is required." }, { status: 400 });
        }

        await prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionStatus: "Paused",
            pausedAt: new Date(),
            payoutsBlockedAt: new Date(),
            gracePeriodEnd: null,
          }
        });

        await prisma.subscriptionOverride.upsert({
          where: { userId },
          create: {
            userId,
            manualPausedByAdmin: true,
            adminId,
            reason: adminReason,
          },
          update: {
            manualPausedByAdmin: true,
            adminId,
            reason: adminReason,
          }
        });

        await auditLog({
          entityType: "USER",
          entityId: userId,
          action: "UPDATED",
          actorId: adminId,
          actorRole: "SUPERADMIN",
          note: `Admin manually paused user subscription. Reason: ${adminReason}`,
        });

        // Notify user
        await prisma.notification.create({
          data: {
            userId,
            title: "⏸ Account Paused by Admin",
            message: "Your account subscription has been manually paused. Please contact support.",
            type: "SYSTEM",
            priority: "HIGH",
          }
        });

        if (user.email) {
          await sendEmail({
            to: user.email,
            subject: "Your PropertyPro Account has been Paused",
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #ef4444;">Account Paused</h2>
                <p>Hi ${user.name || 'Owner'},</p>
                <p>An administrator has manually paused your PropertyPro account.</p>
                <p><strong>Reason:</strong> ${adminReason}</p>
                <p>If you believe this is in error or wish to reactivate your access, please reach out to PropertyPro support.</p>
              </div>
            `
          });
        }

        return NextResponse.json({ success: true });
      }

      case "send_reminder": {
        if (user.email) {
          await sendEmail({
            to: user.email,
            subject: "Action Required: Update your PropertyPro payment details",
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f7; padding: 40px 20px; color: #1d1d1f; line-height: 1.5;">
                <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); border: 1px solid #e5e5ea;">
                  <!-- Brand Header -->
                  <div style="background-color: #1d1d1f; padding: 24px; text-align: center;">
                    <div style="display: inline-flex; align-items: center; gap: 8px;">
                      <span style="font-size: 20px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">Property<span style="color: #007aff;">Pro</span></span>
                    </div>
                  </div>
                  
                  <!-- Body Content -->
                  <div style="padding: 32px 24px;">
                    <h1 style="font-size: 22px; font-weight: 800; color: #1d1d1f; margin-top: 0; margin-bottom: 8px; letter-spacing: -0.5px;">Payment Action Required</h1>
                    <p style="font-size: 15px; color: #1d1d1f; margin-bottom: 20px;">Hi ${user.name || 'Owner'},</p>
                    
                    <p style="font-size: 15px; color: #48484a; margin-bottom: 24px; line-height: 1.6;">
                      This is an official notice from the PropertyPro billing department. We were unable to process your recent subscription payment renewal. To keep your account active and avoid portfolio restrictions, please verify and update your billing method.
                    </p>

                    <!-- Account Summary Card -->
                    <div style="background-color: #f5f5f7; border-radius: 14px; padding: 20px; margin-bottom: 24px; border: 1px solid #e5e5ea;">
                      <h3 style="font-size: 12px; font-weight: 800; color: #8e8e93; text-transform: uppercase; margin-top: 0; margin-bottom: 12px; letter-spacing: 0.5px;">Account Summary</h3>
                      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <tr>
                          <td style="padding: 6px 0; color: #8e8e93; font-weight: 500;">Account Owner</td>
                          <td style="padding: 6px 0; text-align: right; color: #1d1d1f; font-weight: 700;">${user.name || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td style="padding: 6px 0; color: #8e8e93; font-weight: 500;">Current Plan</td>
                          <td style="padding: 6px 0; text-align: right; color: #1d1d1f; font-weight: 700;">${user.pricingTier?.name || 'Hobbyist'}</td>
                        </tr>
                        <tr>
                          <td style="padding: 6px 0; color: #8e8e93; font-weight: 500;">Billing Status</td>
                          <td style="padding: 6px 0; text-align: right; color: #ff9500; font-weight: 700;">${(user.subscriptionStatus || 'Past Due').replace(/_/g, ' ')}</td>
                        </tr>
                      </table>
                    </div>

                    <!-- Impact Block -->
                    <div style="background-color: #fffcfa; border: 1px solid #ffdbb5; border-radius: 14px; padding: 18px; margin-bottom: 28px;">
                      <h3 style="font-size: 13px; font-weight: 800; color: #c93b00; margin-top: 0; margin-bottom: 8px;">⚠️ Impending Service Restrictions</h3>
                      <p style="font-size: 13px; color: #5c2c16; margin: 0; line-height: 1.5;">
                        If payment isn't completed within your grace period, your account status will transition to <strong>Paused</strong>. This blocks the ability to:
                      </p>
                      <ul style="font-size: 13px; color: #5c2c16; margin-top: 8px; margin-bottom: 8px; padding-left: 20px;">
                        <li style="margin-bottom: 4px;">Register new units or properties</li>
                        <li style="margin-bottom: 4px;">Initiate payout withdrawals</li>
                        <li style="margin-bottom: 0;">Add external vendors or contractors</li>
                      </ul>
                      <p style="font-size: 11px; color: #82472d; margin-top: 8px; margin-bottom: 0; font-style: italic;">
                        *Note: Existing active leases, tenant portals, and maintenance processing remain unaffected.
                      </p>
                    </div>

                    <!-- Action Button -->
                    <div style="text-align: center; margin: 32px 0 20px 0;">
                      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/owner/billing" style="background-color: #007aff; color: #ffffff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(0, 122, 255, 0.2); transition: background-color 0.2s ease;">
                        Update Payment Details
                      </a>
                    </div>
                  </div>
                  
                  <!-- Footer -->
                  <div style="background-color: #f5f5f7; padding: 24px; border-top: 1px solid #e5e5ea; text-align: center; font-size: 12px; color: #8e8e93;">
                    <p style="margin-top: 0; margin-bottom: 8px;">Have questions or need assistance? Reply directly to this email or contact support at <a href="mailto:support@propertypro.com" style="color: #007aff; text-decoration: none;">support@propertypro.com</a>.</p>
                    <p style="margin: 0;">© ${new Date().getFullYear()} PropertyPro Technologies Inc. All rights reserved.</p>
                  </div>
                </div>
              </div>
            `
          });
        }

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
