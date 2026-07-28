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

  // Override validity check helper
  const override = user?.subscriptionOverride;
  const now = new Date();

  const isPolicyOverrideActive = (val: boolean | null | undefined, specExpiry: Date | null | undefined) => {
    if (!override || val === null || val === undefined) return null;
    if (override.expiresAt && new Date(override.expiresAt) <= now) return null;
    if (specExpiry && new Date(specExpiry) <= now) return null;
    return val;
  };

  const activeBlockPayouts = isPolicyOverrideActive(override?.blockPayouts, override?.blockPayoutsExpiresAt);
  const activeBlockNewUnits = isPolicyOverrideActive(override?.blockNewUnits, override?.blockNewUnitsExpiresAt);
  const activeAllowAddVendor = isPolicyOverrideActive(override?.allowAddVendor, override?.allowAddVendorExpiresAt);
  const activeAllowAddInspector = isPolicyOverrideActive(override?.allowAddInspector, override?.allowAddInspectorExpiresAt);
  const activeAllowProcessApplications = isPolicyOverrideActive(override?.allowProcessApplications, override?.allowProcessApplicationsExpiresAt);
  const activeAllowAddTenant = isPolicyOverrideActive(override?.allowAddTenant, override?.allowAddTenantExpiresAt);
  const activeAllowTourSlots = isPolicyOverrideActive(override?.allowTourSlots, override?.allowTourSlotsExpiresAt);

  const isOverrideActive = !!(
    activeBlockPayouts !== null ||
    activeBlockNewUnits !== null ||
    activeAllowAddVendor !== null ||
    activeAllowAddInspector !== null ||
    activeAllowProcessApplications !== null ||
    activeAllowAddTenant !== null ||
    activeAllowTourSlots !== null
  );

  return {
    blockPayouts: activeBlockPayouts ??
      (isPastDue ? settings.blockPayoutsOnPastDue : (isPaused ? settings.blockPayoutsOnPaused : false)),
    blockNewUnits: activeBlockNewUnits ??
      (isPaused ? settings.blockNewUnitsOnPaused : false),
    blockAddVendor: activeAllowAddVendor === true
      ? false
      : (activeAllowAddVendor === false
        ? true
        : (isPaused && !isCompedAccess ? settings.blockAddVendorOnPaused : false)),
    blockAddInspector: activeAllowAddInspector === true
      ? false
      : (activeAllowAddInspector === false
        ? true
        : (isPaused && !isCompedAccess ? settings.blockAddInspectorOnPaused : false)),
    blockProcessApplications: activeAllowProcessApplications === true
      ? false
      : (activeAllowProcessApplications === false
        ? true
        : (isPaused && !isCompedAccess ? settings.blockProcessApplicationsOnPaused : false)),
    blockAddTenant: activeAllowAddTenant === true
      ? false
      : (activeAllowAddTenant === false
        ? true
        : (isPaused && !isCompedAccess ? settings.blockAddTenantOnPaused : false)),
    blockTourSlots: activeAllowTourSlots === true
      ? false
      : (activeAllowTourSlots === false
        ? true
        : (isPaused && !isCompedAccess ? settings.blockTourSlotsOnPaused : false)),
    allowMaintenance: override?.allowMaintenance ?? settings.allowMaintenanceOnPaused,
    gracePeriodDays: settings.gracePeriodDays,
    isPaused,
    isPastDue,
    isTrialing,
    isCompedAccess,
    isOverrideActive,
    overrideReason: override?.reason ?? null,
    overrideExpiresAt: override?.expiresAt ? new Date(override.expiresAt) : null,
    gracePeriodEnd: user?.gracePeriodEnd ? new Date(user.gracePeriodEnd) : null,
    pausedAt: user?.pausedAt ? new Date(user.pausedAt) : null,
  };
}

