import { prisma } from "@/lib/prisma";

export type PlanGuardAction = 'ADD_UNIT' | 'ADD_INSPECTOR' | 'ADD_PROPERTY';

export interface PlanGuardResult {
  allowed: boolean;
  code?: 'NO_SUBSCRIPTION' | 'LIMIT_REACHED' | 'TIER_NOT_FOUND';
  message?: string;
  currentCount?: number;
  maxUnits?: number;
  tierName?: string;
}

/**
 * Enforces subscription validity and tier resource limits for property owners.
 */
export async function enforcePlanLimit(
  ownerId: string,
  action: PlanGuardAction,
  additionalCount: number = 1
): Promise<PlanGuardResult> {
  const owner = await prisma.user.findUnique({
    where: { id: ownerId },
    include: { pricingTier: true },
  });

  if (!owner) {
    return { allowed: false, code: 'TIER_NOT_FOUND', message: 'Owner account not found.' };
  }

  // Check subscription status
  const subStatus = (owner.subscriptionStatus || '').toLowerCase();
  const isActive = subStatus === 'active' || subStatus.includes('canceling') || subStatus === 'trialing';

  if (subStatus.includes('past_due')) {
    return {
      allowed: false,
      code: 'NO_SUBSCRIPTION',
      message: 'Your subscription payment is past due. Please update your billing details in settings to reactivate access.',
    };
  }

  if (!isActive && Number(owner.pricingTier?.price || 0) > 0) {
    return {
      allowed: false,
      code: 'NO_SUBSCRIPTION',
      message: 'Active subscription required. Please check your billing settings.',
    };
  }

  const tier = owner.pricingTier;
  const maxUnits = tier?.maxUnits ?? 5; // Default fallback to 5 units if no tier set

  if (action === 'ADD_UNIT' || action === 'ADD_PROPERTY') {
    const currentUnitCount = await prisma.unit.count({
      where: { property: { ownerId } },
    });

    if (currentUnitCount + additionalCount > maxUnits) {
      return {
        allowed: false,
        code: 'LIMIT_REACHED',
        message: `Plan limit reached: Your current plan (${tier?.name || 'Free'}) permits up to ${maxUnits} unit(s). You currently have ${currentUnitCount}.`,
        currentCount: currentUnitCount,
        maxUnits,
        tierName: tier?.name || 'Starter',
      };
    }
  }

  if (action === 'ADD_INSPECTOR') {
    const maxInspectors = tier?.maxInspectors ?? 1;
    const currentInspectors = await prisma.user.count({
      where: { role: 'INSPECTOR', ownerId },
    });

    if (currentInspectors + additionalCount > maxInspectors) {
      return {
        allowed: false,
        code: 'LIMIT_REACHED',
        message: `Inspector limit reached: Your ${tier?.name || 'Starter'} plan allows up to ${maxInspectors} inspector(s). You currently have ${currentInspectors}.`,
        currentCount: currentInspectors,
        maxUnits: maxInspectors,
        tierName: tier?.name || 'Starter',
      };
    }
  }

  return {
    allowed: true,
    currentCount: 0,
    maxUnits,
    tierName: tier?.name || 'Starter',
  };
}
