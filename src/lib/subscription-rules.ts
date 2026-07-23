import { prisma } from "@/lib/prisma";

const DEFAULT_SETTINGS = {
  gracePeriodDays: 7,
  blockPayoutsOnPastDue: true,
  blockPayoutsOnPaused: true,
  blockNewUnitsOnPaused: true,
  allowMaintenanceOnPaused: true,
  blockAddVendorOnPaused: true,
  blockAddInspectorOnPaused: true,
  blockProcessApplicationsOnPaused: true,
  blockAddTenantOnPaused: true,
  blockTourSlotsOnPaused: true,
};

let _settingsCache: { data: any; expiresAt: number } | null = null;

export function invalidateSettingsCache() {
  _settingsCache = null;
}

async function getCachedPlatformSettings(): Promise<any> {
  if (_settingsCache && Date.now() < _settingsCache.expiresAt) {
    return _settingsCache.data;
  }
  try {
    const data = await prisma.platformSettings.findFirst();
    const result = data ? {
      gracePeriodDays: data.gracePeriodDays,
      blockPayoutsOnPastDue: data.blockPayoutsOnPastDue,
      blockPayoutsOnPaused: data.blockPayoutsOnPaused,
      blockNewUnitsOnPaused: data.blockNewUnitsOnPaused,
      allowMaintenanceOnPaused: data.allowMaintenanceOnPaused,
      blockAddVendorOnPaused: data.blockAddVendorOnPaused,
      blockAddInspectorOnPaused: data.blockAddInspectorOnPaused,
      blockProcessApplicationsOnPaused: data.blockProcessApplicationsOnPaused,
      blockAddTenantOnPaused: data.blockAddTenantOnPaused,
      blockTourSlotsOnPaused: data.blockTourSlotsOnPaused,
    } : DEFAULT_SETTINGS;

    _settingsCache = { data: result, expiresAt: Date.now() + 5 * 60 * 1000 };
    return result;
  } catch (err) {
    console.error("Failed to fetch platform settings:", err);
    return DEFAULT_SETTINGS;
  }
}

export interface EffectiveSubscriptionRules {
  blockPayouts: boolean;
  blockNewUnits: boolean;
  blockAddVendor: boolean;
  blockAddInspector: boolean;
  blockProcessApplications: boolean;
  blockAddTenant: boolean;
  blockTourSlots: boolean;
  allowMaintenance: boolean;
  gracePeriodDays: number;
  isPaused: boolean;
  isPastDue: boolean;
  isTrialing: boolean;
  isCompedAccess: boolean;
  isOverrideActive: boolean;
  overrideReason: string | null;
  overrideExpiresAt: Date | null;
  gracePeriodEnd: Date | null;
  pausedAt: Date | null;
}

export async function getEffectiveSubscriptionRules(
  userId: string
): Promise<EffectiveSubscriptionRules> {
  const [settings, user] = await Promise.all([
    getCachedPlatformSettings(),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionStatus: true,
        gracePeriodEnd: true,
        pausedAt: true,
        accessGrantedByAdmin: true,
        accessGrantedExpiresAt: true,
        subscriptionOverride: true,
      }
    })
  ]);

  const status = user?.subscriptionStatus ?? "";
  const isPaused = status === "Paused";
  const isPastDue = status === "Past_Due";
  const isTrialing = status === "Trialing";

  // Comped access check
  const isCompedAccess = !!(
    user?.accessGrantedByAdmin &&
    (!user.accessGrantedExpiresAt || new Date(user.accessGrantedExpiresAt) > new Date())
  );

  // Override validity check
  const override = user?.subscriptionOverride;
  const isOverrideValid = override &&
    (!override.expiresAt || new Date(override.expiresAt) > new Date());
  const activeOverride = isOverrideValid ? override : null;

  return {
    blockPayouts: activeOverride?.blockPayouts ??
      (isPastDue ? settings.blockPayoutsOnPastDue : (isPaused ? settings.blockPayoutsOnPaused : false)),
    blockNewUnits: activeOverride?.blockNewUnits ??
      (isPaused ? settings.blockNewUnitsOnPaused : false),
    // Vendor, inspector, tenant and tour availability gating: only Paused, not comped, not override-exempt
    blockAddVendor: isPaused && !isCompedAccess
      ? settings.blockAddVendorOnPaused
      : false,
    blockAddInspector: isPaused && !isCompedAccess
      ? settings.blockAddInspectorOnPaused
      : false,
    blockProcessApplications: isPaused && !isCompedAccess
      ? settings.blockProcessApplicationsOnPaused
      : false,
    blockAddTenant: isPaused && !isCompedAccess
      ? settings.blockAddTenantOnPaused
      : false,
    blockTourSlots: isPaused && !isCompedAccess
      ? settings.blockTourSlotsOnPaused
      : false,
    allowMaintenance: activeOverride?.allowMaintenance ??
      settings.allowMaintenanceOnPaused,
    gracePeriodDays: settings.gracePeriodDays,
    isPaused,
    isPastDue,
    isTrialing,
    isCompedAccess,
    isOverrideActive: !!activeOverride,
    overrideReason: activeOverride?.reason ?? null,
    overrideExpiresAt: activeOverride?.expiresAt ? new Date(activeOverride.expiresAt) : null,
    gracePeriodEnd: user?.gracePeriodEnd ? new Date(user.gracePeriodEnd) : null,
    pausedAt: user?.pausedAt ? new Date(user.pausedAt) : null,
  };
}

