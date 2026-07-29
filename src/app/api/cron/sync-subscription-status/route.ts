import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

// POST /api/cron/sync-subscription-status
// Weekly self-healing cron. Syncs local subscription statuses with Stripe.
export async function POST(req: NextRequest) {
  // 🔒 CRON SECRET AUTH
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stripe = getStripe();

    // Find all OWNERs who have a linked Stripe subscription
    const owners = await prisma.user.findMany({
      where: {
        role: "OWNER",
        stripeSubscriptionId: { not: null },
      },
      include: {
        subscriptionOverride: true,
      }
    });

    let syncNeededCount = 0;
    const syncedUsers = [];

    for (const owner of owners) {
      if (!owner.stripeSubscriptionId) continue;

      // F3 Skip Guard: Skip users under manual admin override
      const override = owner.subscriptionOverride;
      const isOverrideActive = override &&
        (!override.expiresAt || new Date(override.expiresAt) > new Date());

      if (isOverrideActive && (override.manualRestored || override.manualPausedByAdmin)) {
        console.log(`[Sync Cron] Skipping user ${owner.email} due to active manual admin override`);
        continue;
      }

      // Skip if comped access is active
      const isCompedAccess = owner.accessGrantedByAdmin &&
        (!owner.accessGrantedExpiresAt || new Date(owner.accessGrantedExpiresAt) > new Date());

      if (isCompedAccess) {
        console.log(`[Sync Cron] Skipping user ${owner.email} due to active comped access`);
        continue;
      }

      try {
        const stripeSub = await stripe.subscriptions.retrieve(owner.stripeSubscriptionId);

        // Normalize Stripe status to match our local states
        let normalizedStatus = "Inactive";
        if (stripeSub.status === "active") {
          normalizedStatus = stripeSub.cancel_at_period_end ? "Active (Canceling)" : "Active";
        } else if (stripeSub.status === "trialing") {
          normalizedStatus = "Trialing";
        } else if (stripeSub.status === "past_due") {
          normalizedStatus = "Past_Due";
        } else if (stripeSub.status === "unpaid" || stripeSub.status === "canceled") {
          normalizedStatus = "Paused"; // Soft-lock for payment failure
        } else if (stripeSub.status === "incomplete_expired") {
          normalizedStatus = "Inactive"; // Never properly started
        }

        // If local database status differs from normalized Stripe status, self-heal!
        if (owner.subscriptionStatus !== normalizedStatus) {
          await prisma.user.update({
            where: { id: owner.id },
            data: {
              subscriptionStatus: normalizedStatus,
              // If status is Inactive, clear currentTierId to prompt plan selector
              // Paused status does NOT clear currentTierId
              ...(normalizedStatus === "Inactive" ? { currentTierId: null } : {}),
            },
          });

          // Record a history record of sync update
          await prisma.subscriptionHistory.create({
            data: {
              userId: owner.id,
              fromTierId: owner.currentTierId,
              toTierId: normalizedStatus === "Inactive" ? null : owner.currentTierId,
              event: "SYNC_SELF_HEAL",
              amountPaid: 0,
              createdAt: new Date(),
            },
          });

          syncNeededCount++;
          syncedUsers.push({
            userId: owner.id,
            email: owner.email,
            oldStatus: owner.subscriptionStatus,
            newStatus: normalizedStatus,
          });
        }
      } catch (stripeErr: any) {
        console.error(`[Sync Status Cron] Error fetching stripe subscription for user ${owner.id}:`, stripeErr?.message);
        // If subscription is not found in Stripe, mark local user as Paused (safe downgrade reference)
        if (stripeErr?.code === "resource_missing") {
          await prisma.user.update({
            where: { id: owner.id },
            data: {
              subscriptionStatus: "Paused",
              pausedAt: new Date(),
            },
          });
          syncNeededCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      scanned: owners.length,
      selfHealedCount: syncNeededCount,
      healed: syncedUsers,
    });
  } catch (error: any) {
    console.error("Sync Status Cron Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
