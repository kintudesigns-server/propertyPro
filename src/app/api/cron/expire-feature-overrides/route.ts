import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TENANT_FEATURES, INSPECTOR_FEATURES } from "@/lib/UserFeatureRegistry";

// POST /api/cron/expire-feature-overrides
// Runs periodically (e.g. HOURLY). Finds expired UserAccessOverride records,
// marks them as revoked, and sends a notification to the user that access has been restored.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // 1. Find all active overrides where expiresAt is past
    const expiredOverrides = await prisma.userAccessOverride.findMany({
      where: {
        isRevoked: false,
        expiresAt: {
          not: null,
          lte: now,
        },
      },
    });

    if (expiredOverrides.length === 0) {
      return NextResponse.json({
        message: "No expired feature overrides found.",
        restoredCount: 0,
      });
    }

    const allFeatures = [...TENANT_FEATURES, ...INSPECTOR_FEATURES];
    let restoredCount = 0;

    for (const override of expiredOverrides) {
      // Revoke the override
      await prisma.userAccessOverride.update({
        where: { id: override.id },
        data: {
          isRevoked: true,
          revokedAt: now,
        },
      });

      const matched = allFeatures.find((f) => f.key === override.feature);
      const featureLabel = matched ? matched.label : override.feature;

      // Notify the user that feature access is restored
      await prisma.notification.create({
        data: {
          userId: override.userId,
          title: "✅ Feature Access Restored",
          message: `Your access to the "${featureLabel}" feature has been automatically restored as your temporary restriction has expired.`,
          type: "SYSTEM",
          priority: "MEDIUM",
        },
      });

      restoredCount++;
    }

    return NextResponse.json({
      message: `Successfully processed expired feature overrides.`,
      restoredCount,
    });
  } catch (error: any) {
    console.error("Error in expire-feature-overrides cron:", error);
    return NextResponse.json(
      { error: error.message || "Failed to expire feature overrides" },
      { status: 500 }
    );
  }
}

// GET fallback for testing
export async function GET(req: NextRequest) {
  return POST(req);
}
