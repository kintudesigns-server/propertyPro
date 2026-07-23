import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { auditLog } from "@/lib/audit-log";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-04-10" as any,
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { pricingTier: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Read body parameters if any
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {}

    // Demo Mode Bypass check: Allows local testing to immediately activate the user account
    const isDev = process.env.NODE_ENV === "development" || req.headers.get("host")?.includes("localhost");
    if (body.demoBypass && isDev) {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionStatus: "Active",
          gracePeriodEnd: null,
          pausedAt: null,
          payoutsBlockedAt: null,
        },
      });

      await prisma.subscriptionHistory.create({
        data: {
          userId: user.id,
          toTierId: user.currentTierId,
          toTierName: user.pricingTier?.name || "Active Plan",
          event: "SUBSCRIBED",
          amountPaid: 0,
        },
      });

      await auditLog({
        entityType: "USER",
        entityId: user.id,
        action: "UPDATED",
        actorId: user.id,
        actorRole: "OWNER",
        newValue: { subscriptionStatus: "Active" },
        note: `Subscription reactivated via Demo Mode Bypass.`,
      });

      return NextResponse.json({
        success: true,
        status: "Active",
        message: "Account reactivated via Demo Mode Bypass.",
      });
    }

    // Real-Time Checkout Session Sync (Auto-Heal / Bypass Webhook Delay)
    let activeSubId = user.stripeSubscriptionId;
    if (body.checkoutSessionId) {
      try {
        const checkoutSession = await stripe.checkout.sessions.retrieve(body.checkoutSessionId);
        if (checkoutSession.subscription) {
          activeSubId = checkoutSession.subscription as string;
          const targetTierId = checkoutSession.metadata?.tierId || user.currentTierId;
          
          await prisma.user.update({
            where: { id: user.id },
            data: {
              stripeSubscriptionId: activeSubId,
              currentTierId: targetTierId,
              subscriptionStatus: "Active",
              gracePeriodEnd: null,
              pausedAt: null,
              payoutsBlockedAt: null,
            },
          });
        }
      } catch (err: any) {
        console.error("Failed to retrieve or sync checkout session:", err);
      }
    }

    // Standard Real-World Sync Check
    const subscriptionId = activeSubId;
    if (!subscriptionId) {
      // If they are on a free tier or don't have stripe details
      if (user.pricingTier?.price === 0) {
        if (user.subscriptionStatus !== "Active") {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              subscriptionStatus: "Active",
              gracePeriodEnd: null,
              pausedAt: null,
              payoutsBlockedAt: null,
            }
          });
        }
        return NextResponse.json({ success: true, status: "Active", message: "Free plan is always active." });
      }
      return NextResponse.json({ error: "No active Stripe subscription found to sync." }, { status: 400 });
    }

    // Retrieve subscription from Stripe
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    let mappedStatus = "Active";
    if (sub.status === "past_due") mappedStatus = "Past_Due";
    else if (sub.status === "unpaid" || sub.status === "paused") mappedStatus = "Paused";
    else if (sub.status === "canceled" || sub.status === "incomplete_expired") mappedStatus = "Inactive";
    else if (sub.status === "active" || sub.status === "trialing") mappedStatus = "Active";

    const oldStatus = user.subscriptionStatus;

    // Update in database if status changed or needs clean-up
    const updateData: any = {
      subscriptionStatus: mappedStatus,
    };

    if (mappedStatus === "Active") {
      updateData.gracePeriodEnd = null;
      updateData.pausedAt = null;
      updateData.payoutsBlockedAt = null;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    if (oldStatus !== mappedStatus) {
      await prisma.subscriptionHistory.create({
        data: {
          userId: user.id,
          toTierId: user.currentTierId,
          toTierName: user.pricingTier?.name || "Plan",
          event: mappedStatus === "Active" ? "REACTIVATED" : mappedStatus === "Past_Due" ? "PAST_DUE" : "CANCELED",
          amountPaid: null,
        },
      });

      await auditLog({
        entityType: "USER",
        entityId: user.id,
        action: "UPDATED",
        actorId: user.id,
        actorRole: "OWNER",
        newValue: { subscriptionStatus: mappedStatus },
        note: `Subscription status synced from Stripe. Status changed from ${oldStatus} to ${mappedStatus}.`,
      });
    }

    return NextResponse.json({
      success: true,
      status: mappedStatus,
      message: `Status synced successfully. Current status is ${mappedStatus}.`,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to sync billing status." }, { status: 500 });
  }
}
