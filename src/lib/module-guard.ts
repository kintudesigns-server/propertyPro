import { prisma } from "@/lib/prisma";
import { ModuleKey, ALWAYS_AVAILABLE } from "@/lib/modules-registry";

export interface ModuleGuardResult {
  allowed: boolean;
  source?: "always_available" | "tier" | "admin_grant" | "legacy_tier";
  reason?: string;
  upgradeUrl?: string;
}

export async function checkModuleAccess(
  ownerId: string,
  module: ModuleKey
): Promise<ModuleGuardResult> {
  
  // 1. Always-available modules — fast exit, no DB query needed
  if (ALWAYS_AVAILABLE.includes(module)) {
    return { allowed: true, source: "always_available" };
  }

  // 2. Fetch owner's tier + active grants in ONE query
  const owner = await prisma.user.findUnique({
    where: { id: ownerId },
    select: {
      pricingTier: { select: { modules: true, name: true } },
      moduleGrants: {
        where: {
          module,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        }
      }
    }
  });

  if (!owner) return { allowed: false, reason: "Owner not found" };

  // 3. Admin grant — highest priority
  if (owner.moduleGrants.length > 0) {
    return { allowed: true, source: "admin_grant" };
  }

  // 4. Check tier
  const tierModules = owner.pricingTier?.modules ?? [];
  
  // If tier has no modules set (backward compatibility/legacy)
  if (tierModules.length === 0) {
    return { allowed: true, source: "legacy_tier" };
  }

  if (tierModules.includes(module)) {
    return { allowed: true, source: "tier" };
  }

  // 5. Denied
  return {
    allowed: false,
    reason: `Your ${owner.pricingTier?.name ?? "current"} plan does not include ${module}.`,
    upgradeUrl: "/dashboard/owner/billing"
  };
}

// Helper: returns 403 response with SaaS-standard body
export function moduleLockedResponse(result: ModuleGuardResult) {
  return new Response(JSON.stringify({
    error: "MODULE_LOCKED",
    message: result.reason ?? "This feature is not available on your current plan.",
    upgradeUrl: result.upgradeUrl ?? "/dashboard/owner/billing",
  }), { 
    status: 403,
    headers: { "Content-Type": "application/json" }
  });
}
