import { prisma } from "@/lib/prisma";
import { ModuleKey, ALWAYS_AVAILABLE, GATABLE_MODULES } from "@/lib/modules-registry";

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
  // 1. Fetch owner's tier + active grants/blocks in ONE query
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

  // 2. Admin block override check — highest priority
  const hasBlock = owner.moduleGrants.some(g => (g as any).overrideType === "BLOCK");
  if (hasBlock) {
    return {
      allowed: false,
      source: "admin_block" as any,
      reason: `Access to ${module} has been restricted by administrator.`
    };
  }

  // 3. Always-available modules (only if not blocked)
  if (ALWAYS_AVAILABLE.includes(module)) {
    return { allowed: true, source: "always_available" };
  }

  // 4. Admin grant override check
  const hasGrant = owner.moduleGrants.some(g => !(g as any).overrideType || (g as any).overrideType === "GRANT");
  if (hasGrant) {
    return { allowed: true, source: "admin_grant" };
  }

  // 5. Check tier
  const tierModules = owner.pricingTier?.modules ?? [];
  
  // If tier has no modules set (backward compatibility/legacy)
  if (tierModules.length === 0) {
    return { allowed: true, source: "legacy_tier" };
  }

  if (tierModules.includes(module)) {
    return { allowed: true, source: "tier" };
  }

  // 6. Denied
  return {
    allowed: false,
    reason: `Your ${owner.pricingTier?.name ?? "current"} plan does not include ${module}.`,
    upgradeUrl: "/dashboard/owner/billing"
  };
}

export async function checkAllModulesAccess(
  ownerId: string
): Promise<Record<string, ModuleGuardResult>> {
  const owner = await prisma.user.findUnique({
    where: { id: ownerId },
    select: {
      pricingTier: { select: { modules: true, name: true } },
      moduleGrants: {
        where: {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        }
      }
    }
  });

  const results: Record<string, ModuleGuardResult> = {};

  if (!owner) {
    for (const m of GATABLE_MODULES) {
      results[m.key] = { allowed: false, reason: "Owner not found" };
    }
    return results;
  }

  const tierModules = owner.pricingTier?.modules ?? [];
  const tierName = owner.pricingTier?.name ?? "current";

  for (const m of GATABLE_MODULES) {
    const key = m.key;
    const grantsForModule = owner.moduleGrants.filter(g => g.module === key);
    const hasBlock = grantsForModule.some(g => (g as any).overrideType === "BLOCK");

    if (hasBlock) {
      results[key] = {
        allowed: false,
        source: "admin_block" as any,
        reason: `Access to ${m.label} has been restricted by administrator.`
      };
      continue;
    }

    if (m.alwaysIncluded) {
      results[key] = { allowed: true, source: "always_available" };
      continue;
    }

    const hasGrant = grantsForModule.some(g => !(g as any).overrideType || (g as any).overrideType === "GRANT");
    if (hasGrant) {
      results[key] = { allowed: true, source: "admin_grant" };
      continue;
    }

    if (tierModules.length === 0 || tierModules.includes(key as any)) {
      results[key] = { allowed: true, source: tierModules.length === 0 ? "legacy_tier" : "tier" };
      continue;
    }

    results[key] = {
      allowed: false,
      reason: `Your ${tierName} plan does not include ${m.label}.`,
      upgradeUrl: "/dashboard/owner/billing"
    };
  }

  return results;
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

