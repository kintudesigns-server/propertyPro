import { prisma } from "@/lib/prisma";
import { UserFeatureKey, TENANT_FEATURES, INSPECTOR_FEATURES } from "@/lib/UserFeatureRegistry";

export interface UserAccessGuardResult {
  allowed: boolean;
  reason?: string;
  source?: "default" | "admin_block" | "admin_grant" | "suspended";
  expiresAt?: string | null;
  daysRemaining?: number | null;
  blockedAt?: string | null;
  adminNote?: string | null;
  featureLabel?: string;
}

export async function checkUserFeatureAccess(
  userId: string,
  feature: UserFeatureKey
): Promise<UserAccessGuardResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      accountStatus: true,
      userAccessOverrides: {
        where: {
          feature,
          isRevoked: false,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!user) {
    return { allowed: false, reason: "User not found." };
  }

  // Get feature label from registry
  const allFeatures = [...TENANT_FEATURES, ...INSPECTOR_FEATURES];
  const matchedFeature = allFeatures.find(f => f.key === feature);
  const featureLabel = matchedFeature ? matchedFeature.label : feature;

  // 1. If account is suspended platform-wide, block everything
  if (user.accountStatus === "SUSPENDED") {
    return {
      allowed: false,
      source: "suspended",
      reason: "Your account is currently suspended.",
      featureLabel
    };
  }


  // 2. Check for active BLOCK overrides
  const blockOverride = user.userAccessOverrides.find(o => o.overrideType === "BLOCK");
  if (blockOverride) {
    const expiresAtStr = blockOverride.expiresAt ? blockOverride.expiresAt.toISOString() : null;
    let daysRemaining: number | null = null;
    if (blockOverride.expiresAt) {
      const diffTime = blockOverride.expiresAt.getTime() - Date.now();
      daysRemaining = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    return {
      allowed: false,
      source: "admin_block",
      reason: blockOverride.reason || "Access to this feature has been restricted by an administrator.",
      adminNote: blockOverride.reason,
      expiresAt: expiresAtStr,
      daysRemaining,
      blockedAt: blockOverride.createdAt.toISOString(),
      featureLabel
    };
  }

  // 3. Check for active GRANT overrides
  const hasGrant = user.userAccessOverrides.some(o => o.overrideType === "GRANT");
  if (hasGrant) {
    return { allowed: true, source: "admin_grant", featureLabel };
  }

  // 4. Default: Allowed
  return { allowed: true, source: "default", featureLabel };
}
