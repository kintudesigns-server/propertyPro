/**
 * Unit tests for src/lib/subscription-rules.ts
 * Uses Node.js native test runner (tsx --test)
 * 
 * Run: npm test
 */
import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

// ─── Mock Prisma before importing the module under test ──────────────────────
// We stub out the Prisma calls so tests don't need a real DB
let mockPlatformSettings: any = null;
let mockUser: any = null;

mock.module("@/lib/prisma", {
  namedExports: {
    prisma: {
      platformSettings: {
        findFirst: async () => mockPlatformSettings,
      },
      user: {
        findUnique: async () => mockUser,
      },
    },
  },
});

// Import AFTER mocking
const { getEffectiveSubscriptionRules } = await import("@/lib/subscription-rules");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<{
  subscriptionStatus: string;
  gracePeriodEnd: Date | null;
  pausedAt: Date | null;
  accessGrantedByAdmin: boolean;
  accessGrantedExpiresAt: Date | null;
  subscriptionOverride: any;
}> = {}) {
  return {
    subscriptionStatus: "Active",
    gracePeriodEnd: null,
    pausedAt: null,
    accessGrantedByAdmin: false,
    accessGrantedExpiresAt: null,
    subscriptionOverride: null,
    ...overrides,
  };
}

function makePlatformSettings(overrides: Partial<{
  gracePeriodDays: number;
  blockPayoutsOnPastDue: boolean;
  blockPayoutsOnPaused: boolean;
  blockNewUnitsOnPaused: boolean;
  allowMaintenanceOnPaused: boolean;
  blockAddVendorOnPaused: boolean;
  blockAddInspectorOnPaused: boolean;
  blockProcessApplicationsOnPaused: boolean;
  blockAddTenantOnPaused: boolean;
  blockTourSlotsOnPaused: boolean;
}> = {}) {
  return {
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
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("getEffectiveSubscriptionRules", () => {

  beforeEach(() => {
    // Reset mocks before each test
    mockPlatformSettings = makePlatformSettings();
    mockUser = makeUser();
  });

  it("Active subscription: all actions allowed", async () => {
    mockUser = makeUser({ subscriptionStatus: "Active" });

    const rules = await getEffectiveSubscriptionRules("user-123");

    assert.equal(rules.blockPayouts, false, "Active owner should not have payouts blocked");
    assert.equal(rules.blockNewUnits, false, "Active owner should not have new units blocked");
    assert.equal(rules.isPaused, false);
    assert.equal(rules.isPastDue, false);
    assert.equal(rules.isCompedAccess, false);
  });

  it("Paused subscription: all gated actions blocked", async () => {
    mockUser = makeUser({ subscriptionStatus: "Paused", pausedAt: new Date() });

    const rules = await getEffectiveSubscriptionRules("user-123");

    assert.equal(rules.isPaused, true);
    assert.equal(rules.blockPayouts, true, "Paused owner should have payouts blocked");
    assert.equal(rules.blockNewUnits, true, "Paused owner should not add new units");
    assert.equal(rules.blockAddVendor, true, "Paused owner should not add vendors");
    assert.equal(rules.blockAddTenant, true, "Paused owner should not add tenants");
  });

  it("Comped access: bypasses paused restrictions", async () => {
    mockUser = makeUser({
      subscriptionStatus: "Paused",
      pausedAt: new Date(),
      accessGrantedByAdmin: true,
      accessGrantedExpiresAt: new Date(Date.now() + 86400000), // 1 day from now
    });

    const rules = await getEffectiveSubscriptionRules("user-123");

    assert.equal(rules.isCompedAccess, true);
    // Comped access should bypass vendor/tenant/inspector/tour blocks
    assert.equal(rules.blockAddVendor, false, "Comped access bypasses vendor block");
    assert.equal(rules.blockAddTenant, false, "Comped access bypasses tenant block");
    assert.equal(rules.blockTourSlots, false, "Comped access bypasses tour block");
  });

  it("Expired comped access: restrictions resume", async () => {
    mockUser = makeUser({
      subscriptionStatus: "Paused",
      pausedAt: new Date(),
      accessGrantedByAdmin: true,
      accessGrantedExpiresAt: new Date(Date.now() - 1000), // expired 1 second ago
    });

    const rules = await getEffectiveSubscriptionRules("user-123");

    assert.equal(rules.isCompedAccess, false, "Expired comp access should not be active");
    assert.equal(rules.blockAddVendor, true, "Expired comp access should resume restrictions");
  });

  it("Past due: payouts blocked, but not all actions", async () => {
    mockUser = makeUser({ subscriptionStatus: "Past_Due" });

    const rules = await getEffectiveSubscriptionRules("user-123");

    assert.equal(rules.isPastDue, true);
    assert.equal(rules.blockPayouts, true, "Past due should block payouts");
    assert.equal(rules.blockNewUnits, false, "Past due should not block new units");
  });

  it("Active override: overrides platform defaults", async () => {
    mockUser = makeUser({
      subscriptionStatus: "Paused",
      pausedAt: new Date(),
      subscriptionOverride: {
        blockPayouts: false,          // Override: allow payouts even when paused
        blockNewUnits: null,
        allowAddVendor: true,         // Override: allow vendor add
        allowAddInspector: null,
        allowProcessApplications: null,
        allowAddTenant: null,
        allowTourSlots: null,
        allowMaintenance: true,
        reason: "Hardship exception for trusted owner",
        expiresAt: new Date(Date.now() + 86400000), // valid
      },
    });

    const rules = await getEffectiveSubscriptionRules("user-123");

    assert.equal(rules.isOverrideActive, true);
    assert.equal(rules.blockPayouts, false, "Override should allow payouts");
    assert.equal(rules.blockAddVendor, false, "Override allowAddVendor=true should unblock vendor");
    assert.equal(rules.overrideReason, "Hardship exception for trusted owner");
  });

  it("Expired override: reverts to platform defaults", async () => {
    mockUser = makeUser({
      subscriptionStatus: "Paused",
      pausedAt: new Date(),
      subscriptionOverride: {
        blockPayouts: false,
        allowAddVendor: true,
        reason: "Expired exception",
        expiresAt: new Date(Date.now() - 1000), // expired
      },
    });

    const rules = await getEffectiveSubscriptionRules("user-123");

    assert.equal(rules.isOverrideActive, false, "Expired override should not be active");
    assert.equal(rules.blockPayouts, true, "Expired override: paused restrictions should resume");
  });

  it("Trialing subscription: not paused, not past due", async () => {
    mockUser = makeUser({ subscriptionStatus: "Trialing" });

    const rules = await getEffectiveSubscriptionRules("user-123");

    assert.equal(rules.isTrialing, true);
    assert.equal(rules.isPaused, false);
    assert.equal(rules.isPastDue, false);
    assert.equal(rules.blockPayouts, false, "Trialing should not block payouts");
  });

  it("Returns grace period metadata correctly", async () => {
    const gracePeriodEnd = new Date(Date.now() + 3 * 86400000);
    mockUser = makeUser({ subscriptionStatus: "Past_Due", gracePeriodEnd });

    const rules = await getEffectiveSubscriptionRules("user-123");

    assert.ok(rules.gracePeriodEnd instanceof Date, "gracePeriodEnd should be a Date");
    assert.equal(
      rules.gracePeriodEnd!.toISOString(),
      gracePeriodEnd.toISOString(),
      "gracePeriodEnd should match"
    );
    assert.equal(rules.gracePeriodDays, 7, "gracePeriodDays should use platform default");
  });
});
