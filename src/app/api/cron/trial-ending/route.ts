import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { getStripe } from "@/lib/stripe";

// POST /api/cron/trial-ending
// Runs daily. Alerts users 3 days before their trials expire.
export async function POST(req: NextRequest) {
  // 🔒 CRON SECRET AUTH
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stripe = getStripe();

    // Find all OWNERs who are in Trialing status and have a Stripe Subscription
    const trialingUsers = await prisma.user.findMany({
      where: {
        role: "OWNER",
        subscriptionStatus: "Trialing",
        stripeSubscriptionId: { not: null },
      },
    });

    let alertedCount = 0;
    const now = Date.now();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

    for (const user of trialingUsers) {
      if (!user.stripeSubscriptionId) continue;

      try {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

        if (subscription.status === "trialing" && subscription.trial_end) {
          const trialEndMs = subscription.trial_end * 1000;
          const timeLeftMs = trialEndMs - now;

          // If trial ends in <= 3 days (and hasn't ended yet)
          if (timeLeftMs > 0 && timeLeftMs <= threeDaysMs) {
            // Check if we already sent a trial warning in the last 5 days
            const lastAlert = await prisma.notification.findFirst({
              where: {
                userId: user.id,
                title: "⚠️ Free Trial Ending Soon",
                createdAt: { gte: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
              },
            });

            if (!lastAlert) {
              const daysLeft = Math.ceil(timeLeftMs / (24 * 60 * 60 * 1000));
              await notify({
                userId: user.id,
                title: "⚠️ Free Trial Ending Soon",
                message: `Your free trial period will end in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Add a payment method under Billing settings to ensure uninterrupted services.`,
                type: "SYSTEM",
                priority: "HIGH",
              });
              alertedCount++;
            }
          }
        }
      } catch (stripeErr) {
        console.error(`[Trial Ending Cron] Failed to fetch stripe sub for user ${user.id}:`, stripeErr);
      }
    }

    return NextResponse.json({
      success: true,
      scanned: trialingUsers.length,
      alerted: alertedCount,
    });
  } catch (error: any) {
    console.error("Trial Ending Cron Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
