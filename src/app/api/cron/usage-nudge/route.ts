import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

// POST /api/cron/usage-nudge
// Runs periodically (e.g. weekly). Checks owners unit capacity usage and nudges them if >= 80%.
export async function POST(req: NextRequest) {
  // 🔒 CRON SECRET AUTH
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find all OWNERs who have an active/trialing/canceling subscription and a linked pricing tier
    const owners = await prisma.user.findMany({
      where: {
        role: "OWNER",
        currentTierId: { not: null },
        subscriptionStatus: { in: ["Active", "trialing", "Active (Canceling)"] },
      },
      include: {
        pricingTier: true,
      },
    });

    let nudgedCount = 0;

    for (const owner of owners) {
      if (!owner.pricingTier) continue;
      const maxUnits = owner.pricingTier.maxUnits;
      if (maxUnits <= 0) continue; // Unlimited plan

      // Get count of registered units
      const unitCount = await prisma.unit.count({
        where: { property: { ownerId: owner.id } },
      });

      const usagePercent = (unitCount / maxUnits) * 100;

      if (usagePercent >= 80) {
        // Check if we sent them a nudge in the last 30 days
        const lastNudge = await prisma.notification.findFirst({
          where: {
            userId: owner.id,
            title: "🚀 Approaching Plan Capacity",
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        });

        if (!lastNudge) {
          await notify({
            userId: owner.id,
            title: "🚀 Approaching Plan Capacity",
            message: `You have registered ${unitCount} of ${maxUnits} units allowed on your ${owner.pricingTier.name} plan (${Math.round(usagePercent)}% capacity). Consider upgrading to a higher plan to add more properties and keep growing.`,
            type: "SYSTEM",
            priority: "MEDIUM",
          });
          nudgedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      ownersScanned: owners.length,
      ownersNudged: nudgedCount,
    });
  } catch (error: any) {
    console.error("Usage Nudge Cron Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
