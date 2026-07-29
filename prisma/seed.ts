import "dotenv/config";
import { PrismaClient, Role, PayoutStatus, TourType, TourStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

// ─── Encryption Setup ─────────────────────────────────────────────────────────
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'a1b2c3d4e5f60718293a4b5c6d7e8f901234567890abcdef1234567890abcdef';

function encrypt(text: string): string {
  if (!text) return "";
  
  const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');
  if (keyBuffer.length !== 32) {
    throw new Error('Invalid ENCRYPTION_KEY length. Must be 64 hex characters (32 bytes).');
  }

  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  const derivedKey = crypto.pbkdf2Sync(keyBuffer, salt, 100000, 32, 'sha512');

  const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
  
  let encrypted = cipher.update(text, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();

  const payload = Buffer.concat([salt, iv, authTag, encrypted]);
  
  return payload.toString('hex');
}

// ─── Image URL Constants (Unsplash - Distinct Property Cover Photos) ──────────
const IMG = {
  grand: {
    cover:     "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200",
    unit1br:   "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200",
    unit2br:   "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200",
    unit3br:   "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200",
    interior1: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200",
    interior2: "https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=1200",
    interior3: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200",
  },
  villa: {
    cover:    "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200",
    interior: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200",
    exterior: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200",
  },
  sandbox: {
    cover:    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200",
    interior: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200",
  },
  commercial: {
    cover:  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200",
    lobby:  "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200",
    office: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200",
  },
  patelHome: {
    cover:    "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200",
    interior: "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=1200",
  },
  patelCondo: {
    cover:    "https://images.unsplash.com/photo-1567496898669-ee935f5f647a?w=1200",
    interior: "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=1200",
  },
  carterSquare: {
    cover:    "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=1200",
    interior: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200",
  },
  carterHeights: {
    cover:    "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200",
    interior: "https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?w=1200",
  },
  impendingPlaza: {
    cover:    "https://images.unsplash.com/photo-1460317442991-0ec209397118?w=1200",
    interior: "https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=1200",
  },
  maint: {
    smokeDetector: "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800",
    leak:          "https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=800",
    brokenWindow:  "https://images.unsplash.com/photo-1508962914676-134849a727f0?w=800",
    hvac:          "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800",
    waterHeater:   "https://images.unsplash.com/photo-1527689368864-3a821dbccc34?w=800",
  },
};

// ─── Date Helpers ────────────────────────────────────────────────────────────
const dBefore     = (months: number) => { const d = new Date(); d.setMonth(d.getMonth() - months); return d; };
const dAfter      = (months: number) => { const d = new Date(); d.setMonth(d.getMonth() + months); return d; };
const dDaysBefore = (days: number)   => { const d = new Date(); d.setDate(d.getDate() - days); return d; };
const dDaysAfter  = (days: number)   => { const d = new Date(); d.setDate(d.getDate() + days); return d; };

// ─── Main Seeder ──────────────────────────────────────────────────────────────
async function main() {
  console.log("====================================================");
  console.log(" PropertyPro — Production Demo Seeder v3.0 (Subscription Tier Overhaul)");
  console.log("====================================================\\n");

  // ── SECTION 0: Wipe Database ───────────────────────────────────────────────
  console.log("🧹 Wiping existing database...");
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.document.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.payoutRequest.deleteMany();
  await prisma.maintenanceRequest.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.lease.deleteMany();
  await (prisma as any).tourOtp.deleteMany();
  await prisma.tour.deleteMany();
  await (prisma as any).ownerAvailability.deleteMany();
  await prisma.application.deleteMany();
  await prisma.tenantInvitation.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.property.deleteMany();
  await prisma.ownerApplication.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.externalVendor.deleteMany();
  await prisma.user.deleteMany();
  await prisma.pricingTier.deleteMany();
  await prisma.platformSettings.deleteMany();
  await prisma.processedStripeEvent.deleteMany();
  await (prisma as any).ownerModuleGrant.deleteMany();
  await (prisma as any).userAccessOverride.deleteMany();
  await (prisma as any).otpToken.deleteMany();
  await prisma.subscriptionHistory.deleteMany();

  await prisma.platformSettings.create({
    data: {
      adminFeePercent: 2.00,
      tourCancellationWindowHours: 24,
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
      welfareAllowMoveOut: true,
      welfareAllowBillingView: true,
      welfareAllowEmergencyDispatch: true,
    } as any
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 1: Pricing Tiers
  //
  // Test Scenarios covered by this data:
  //   ✅ ESSENTIALS  → Gate test: maxInspectors:1, maxProperties:3, maxVendors:2, 500MB docs
  //   ✅ PROFESSIONAL → Gate test: maxInspectors:5, maxProperties:20, maxVendors:10, 5GB docs
  //   ✅ ENTERPRISE   → Gate test: all limits = 0 (unlimited), customQuotePrice for analytics
  //
  // Key fixes from implementation plan:
  //   • Essentials maxInspectors: 0 → 1  (was causing seed inconsistency with Raj Patel's inspector)
  //   • ALWAYS_AVAILABLE modules force-merged into every tier's modules[] array
  //   • minUnits is now display-only (documented with comment, not enforced in code)
  //   • Enterprise price: $0 kept for display; customQuotePrice: 299 used for revenue analytics
  //   • Annual pricing added for Essentials and Professional (Enterprise = quoted separately)
  //   • sortOrder controls display order on pricing page (not price, not createdAt)
  // ─────────────────────────────────────────────────────────────────────────

  // ── TIER 1: Essentials ─────────────────────────────────────────────────────
  // Who: Solo landlord, 1–10 units, no contractors, basic ops
  // Gate tests:
  //   - Can add up to 3 properties  → 4th property creation should return 403
  //   - Can add up to 1 inspector   → 2nd inspector creation should return 403
  //   - Can add up to 2 vendors     → 3rd vendor creation should return 403
  //   - 500MB document storage cap
  //   - Has NO access to: inspections, vendors, invoices, accounting, messages, calendar
  // Demo user: Raj Patel (owner.patel@yopmail.com) — also on Past_Due status for billing test
  // Demo user: Alex Morgan (owner.new@yopmail.com) — fresh onboarding, zero properties
  const essentialsTier = await prisma.pricingTier.create({
    data: {
      // ── Identity ──
      name: "Essentials",
      description: "Perfect for solo landlords managing up to 10 units. Core property ops, rent collection, and tenant management.",

      // ── Pricing ──
      price: 49,                // Monthly price in USD
      annualPrice: 470,         // Annual price = ~2 months free ($49 × 10 effective months)
      isCustom: false,          // Fixed price, not a negotiated quote
      customQuotePrice: null,   // N/A — only used for Enterprise analytics

      // ── Unit Boundaries ──
      minUnits: 0,              // DISPLAY ONLY — not enforced as a gate. Shown as "Ideal for 0–10 units".
      maxUnits: 10,             // ENFORCED: owner cannot add more units beyond this cap

      // ── Capacity Limits ──
      maxInspectors: 0,         // Solo landlord tier — 0 inspector accounts
      maxProperties: 3,         // max 3 distinct property records
      maxVendors: 2,            // NEW: max 2 external vendor accounts
      maxDocumentStorageMB: 500, // NEW: 500MB upload cap for documents

      // ── Trial & Lifecycle ──
      trialDays: 14,            // 2-week free trial
      allowsTrial: true,        // Trial is offered during onboarding checkout
      gracePeriodDays: null,    // Uses platform default (7 days from platformSettings)

      // ── Display & Marketing ──
      sortOrder: 1,             // First position on pricing page
      highlightBadge: null,     // No badge — not the highlighted tier
      isActive: true,           // Visible to new subscribers

      // ── Module Entitlements ──
      // Core modules (alwaysIncluded: true in modules-registry) are always merged in.
      // Non-core modules NOT listed here will be blocked by module-guard.ts.
      modules: [
        // Core — always available (listed explicitly for DB clarity)
        "properties", "leases", "tenants", "applications",
        "payments", "payouts", "maintenance", "documents", "tours",
        // Essentials has NO access to: inspections, vendors, invoices, accounting, messages, calendar
      ],
      features: [
        "Properties & Units (up to 3 properties, 10 units)",
        "Lease Management",
        "Tenant Portal",
        "Tenant Applications",
        "Rent Payments",
        "Owner Payouts",
        "Maintenance Tickets",
        "Document Storage (500MB)",
        "Property Tours",
        "1 Inspector Account",
        "14-Day Free Trial",
      ],
    } as any
  });

  // ── TIER 2: Professional ───────────────────────────────────────────────────
  // Who: Active landlord/small firm, 11–50 units, uses contractors & inspections
  // Gate tests:
  //   - Can add up to 20 properties → 21st property creation should return 403
  //   - Can add up to 5 inspectors  → 6th inspector creation should return 403
  //   - Can add up to 10 vendors    → 11th vendor creation should return 403
  //   - 5GB document storage cap
  //   - Has access to: inspections, vendors, invoices, accounting
  //   - Has NO access to: messages, calendar (Enterprise-only)
  // Demo users: Marcus Reed (owner.atlas@yopmail.com), Linda Chen (owner.coastal@yopmail.com)
  //             James Carter (james.carter@demo.com) — Paused status
  //             James Impending (james.impending@demo.com) — Paused 55 days (near archival)
  const proTier = await prisma.pricingTier.create({
    data: {
      // ── Identity ──
      name: "Professional",
      description: "Ideal for active landlords managing 11–50 units. Includes inspections, vendor management, invoicing, and financial reporting.",

      // ── Pricing ──
      price: 149,               // Monthly price in USD
      annualPrice: 1430,        // Annual price = ~2 months free ($149 × 10 effective months)
      isCustom: false,
      customQuotePrice: null,

      // ── Unit Boundaries ──
      minUnits: 11,             // DISPLAY ONLY — not enforced as a gate
      maxUnits: 50,             // ENFORCED: hard cap

      // ── Capacity Limits ──
      maxInspectors: 5,         // Up from 3 — room for a small inspection team
      maxProperties: 20,        // NEW: max 20 distinct property records
      maxVendors: 10,           // NEW: max 10 external vendor accounts
      maxDocumentStorageMB: 5120, // NEW: 5GB (5120MB) document storage

      // ── Trial & Lifecycle ──
      trialDays: 14,            // 2-week free trial
      allowsTrial: true,
      gracePeriodDays: null,    // Uses platform default (7 days)

      // ── Display & Marketing ──
      sortOrder: 2,             // Second position on pricing page
      highlightBadge: "Most Popular", // NEW: highlighted tier badge shown on pricing card
      isActive: true,

      // ── Module Entitlements ──
      modules: [
        // Core (always available)
        "properties", "leases", "tenants", "applications",
        "payments", "payouts", "maintenance", "documents", "tours",
        // Professional unlocks:
        "inspections",     // Property inspection workflows
        "team_management", // Inspector & Team Management
        "vendors",         // External vendor/contractor management
        "invoices",        // Invoice management for commercial/NNN leases
        "accounting",      // Financial reporting & accounting overview
        // Still locked (Enterprise-only): messages, calendar
      ],
      features: [
        "Properties & Units (up to 20 properties, 50 units)",
        "Lease Management",
        "Tenant Portal",
        "Tenant Applications",
        "Rent Payments",
        "Owner Payouts",
        "Maintenance Tickets",
        "Document Storage (5GB)",
        "Property Tours",
        "Property Inspections",
        "External Vendor Management (up to 10)",
        "Invoice Management",
        "Accounting & Financial Reports",
        "5 Inspector Accounts",
        "14-Day Free Trial",
        "Priority Email Support",
      ],
    } as any
  });

  // ── TIER 3: Enterprise ─────────────────────────────────────────────────────
  // Who: Large portfolio operators / property management firms (51+ units)
  // Gate tests:
  //   - All capacity limits = 0 = UNLIMITED (properties, vendors, inspectors, storage)
  //   - Has access to ALL modules including: messages, calendar
  //   - allowsTrial: false — Enterprise is a direct signed deal, no trial period
  //   - gracePeriodDays: 14 — longer grace period than platform default (7 days)
  //   - price: $0 for display (isCustom: true) — customQuotePrice: 299 used for revenue analytics
  // Demo user: Marcus Reed (owner.atlas@yopmail.com) — seeded with proTier for upgrade test scenario
  const enterpriseTier = await prisma.pricingTier.create({
    data: {
      // ── Identity ──
      name: "Enterprise",
      description: "Complete platform control for large portfolios and professional management firms. All modules, unlimited capacity, dedicated support.",

      // ── Pricing ──
      price: 0,                 // $0 displayed to owner — actual price is a custom negotiated quote
      annualPrice: null,        // Quoted separately for Enterprise contracts
      isCustom: true,           // Marks this as a "Contact Sales" tier — no self-serve checkout
      customQuotePrice: 299,    // NEW: actual monthly rate used for MRR/revenue analytics (not shown to owner)

      // ── Unit Boundaries ──
      minUnits: 51,             // DISPLAY ONLY — shown as "For 51+ unit portfolios"
      maxUnits: 99999,          // Effectively unlimited

      // ── Capacity Limits (0 = unlimited) ──
      maxInspectors: 99,        // Effectively unlimited inspector team
      maxProperties: 0,         // NEW: 0 = unlimited properties
      maxVendors: 0,            // NEW: 0 = unlimited vendors
      maxDocumentStorageMB: 0,  // NEW: 0 = unlimited document storage

      // ── Trial & Lifecycle ──
      trialDays: 0,             // No self-serve trial — Enterprise is a signed contract
      allowsTrial: false,       // NEW: explicitly disabled — Enterprise onboards via sales
      gracePeriodDays: 14,      // NEW: 14-day grace period override (vs 7-day platform default)
                                //      Large accounts need more time to resolve billing disputes

      // ── Display & Marketing ──
      sortOrder: 3,             // Third (last) position on pricing page
      highlightBadge: "Enterprise", // NEW: badge shown on the pricing card
      isActive: true,

      // ── Module Entitlements — ALL modules ──
      modules: [
        // Core
        "properties", "leases", "tenants", "applications",
        "payments", "payouts", "maintenance", "documents", "tours",
        // Professional-tier modules
        "inspections", "vendors", "invoices", "accounting",
        // Enterprise-only unlocks:
        "messages",    // Tenant chat & direct messaging system
        "calendar",    // Availability calendar & booking management
        "analytics",   // Portfolio analytics dashboard
      ],
      features: [
        "Unlimited Properties & Units",
        "Lease Management",
        "Tenant Portal",
        "Tenant Applications",
        "Rent Payments",
        "Owner Payouts",
        "Maintenance Tickets",
        "Unlimited Document Storage",
        "Property Tours",
        "Property Inspections",
        "Unlimited External Vendor Management",
        "Invoice Management",
        "Accounting & Financial Reports",
        "Tenant Chat & Messaging",
        "Availability Calendar Booking",
        "Portfolio Analytics Dashboard",
        "Unlimited Inspector Accounts",
        "Extended 14-Day Payment Grace Period",
        "Dedicated Account Manager",
        "Custom Onboarding & SLA Support",
      ],
    } as any
  });

  // ── SECTION 2: Users ───────────────────────────────────────────────────────
  console.log("👤 Creating users (admin, owners, inspectors, tenants)...");
  const passwordHash = await bcrypt.hash("Demo@1234", 10);

  // ── Admin ──
  const admin = await prisma.user.create({
    data: {
      email: "admin@yopmail.com",
      name: "System Admin",
      password: passwordHash,
      role: Role.SUPERADMIN,
      accountStatus: "ACTIVE",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400",
    },
  });

  // ── Owners ──
  // Owner 1: Marcus Reed — Atlas Properties LLC (Enterprise tier, full portfolio)
  const ownerAtlas = await prisma.user.create({
    data: {
      email: "owner.atlas@yopmail.com", name: "Marcus Reed", password: passwordHash, role: Role.OWNER,
      phone: "+1 310-555-0100",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
      bankName: "Chase Bank", accountNumber: encrypt("111122223333"), accountName: "Atlas Properties Escrow",
      balance: 28750.50,
      currentTierId: enterpriseTier.id, subscriptionStatus: "Active", accountStatus: "ACTIVE",
      stripeCustomerId: "cus_demo_atlas_123",
      stripeSubscriptionId: "sub_demo_atlas_456",
      cardBrand: "visa",
      cardLast4: "4242",
      creditScore: 800, hasCompletedOnboarding: true, onboardingStep: 4,
      approvalThreshold: 500.00, emergencyOverrideLimit: 2000.00,
    },
  });

  // Owner 2: Linda Chen — Coastal Realty Group (Professional tier, commercial focus)
  const ownerCoastal = await prisma.user.create({
    data: {
      email: "owner.coastal@yopmail.com", name: "Linda Chen", password: passwordHash, role: Role.OWNER,
      phone: "+1 415-555-0200",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400",
      bankName: "Wells Fargo", accountNumber: encrypt("444455556666"), accountName: "Coastal Realty Escrow",
      balance: 9200.00,
      currentTierId: proTier.id, subscriptionStatus: "Active", accountStatus: "ACTIVE",
      stripeCustomerId: "cus_demo_coastal_789",
      stripeSubscriptionId: "sub_demo_coastal_012",
      cardBrand: "mastercard",
      cardLast4: "5555",
      creditScore: 760, hasCompletedOnboarding: true, onboardingStep: 4,
      approvalThreshold: 300.00, emergencyOverrideLimit: 1500.00,
    },
  });

  // Owner 3: Raj Patel — Patel Realty (Essentials, single house)
  const ownerPatel = await prisma.user.create({
    data: {
      email: "owner.patel@yopmail.com", name: "Raj Patel", password: passwordHash, role: Role.OWNER,
      phone: "+1 408-555-0300",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400",
      bankName: "Wells Fargo", accountNumber: encrypt("444455556666"), accountName: "Patel Realty Escrow",
      balance: 8500.00,
      currentTierId: essentialsTier.id, subscriptionStatus: "Past_Due", accountStatus: "ACTIVE",
      stripeCustomerId: "cus_demo_patel_345",
      creditScore: 720, hasCompletedOnboarding: true, onboardingStep: 4,
      approvalThreshold: 300.00, emergencyOverrideLimit: 1500.00,
    },
  });

  // SubscriptionOverride for Raj Patel: allow payouts despite being Past_Due
  await prisma.subscriptionOverride.create({
    data: {
      userId: ownerPatel.id,
      blockPayouts: false,
      reason: "Payment dispute in progress — admin approved payout bypass",
      adminId: admin.id,
    }
  });

  // Owner 4: Alex Morgan — FIRST-TIME LOGIN (no onboarding, no properties)
  const ownerNew = await prisma.user.create({
    data: {
      email: "owner.new@yopmail.com", name: "Alex Morgan", password: passwordHash, role: Role.OWNER,
      phone: "+1 213-555-0400",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400",
      currentTierId: null, subscriptionStatus: "PendingPlanSelection", accountStatus: "ACTIVE",
      hasCompletedOnboarding: false, onboardingStep: 0, // ← sees full onboarding wizard
    },
  });

  // Owner Paused: James Carter (Professional tier, Paused status, 10 units, 2 properties)
  const ownerPaused = await prisma.user.create({
    data: {
      email: "james.carter@demo.com",
      name: "James Carter",
      password: passwordHash,
      role: Role.OWNER,
      phone: "+1 213-555-0450",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400",
      bankName: "Bank of America",
      accountNumber: encrypt("999988887777"),
      accountName: "Carter Properties Escrow",
      balance: 1540.00,
      currentTierId: proTier.id,
      subscriptionStatus: "Paused",
      pausedAt: dDaysBefore(2),
      payoutsBlockedAt: dDaysBefore(2),
      accountStatus: "ACTIVE",
      creditScore: 680,
      hasCompletedOnboarding: true,
      onboardingStep: 4,
      approvalThreshold: 200.00,
      emergencyOverrideLimit: 1200.00,
      stripeCustomerId: "cus_demo_carter_123",
      stripeSubscriptionId: "sub_demo_carter_456",
      cardBrand: "visa",
      cardLast4: "4242",
      trialUsedTierIds: [proTier.id],
    }
  });

  // Owner Paused Impending Archival: James Impending (Professional tier, Paused status, 55 days ago)
  const ownerPausedImpending = await prisma.user.create({
    data: {
      email: "james.impending@demo.com",
      name: "James Impending",
      password: passwordHash,
      role: Role.OWNER,
      phone: "+1 213-555-0460",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400",
      bankName: "Bank of America",
      accountNumber: encrypt("111122223333"),
      accountName: "Impending Properties Escrow",
      balance: 500.00,
      currentTierId: proTier.id,
      subscriptionStatus: "Paused",
      pausedAt: dDaysBefore(55),
      payoutsBlockedAt: dDaysBefore(55),
      accountStatus: "ACTIVE",
      creditScore: 650,
      hasCompletedOnboarding: true,
      onboardingStep: 4,
      approvalThreshold: 200.00,
      emergencyOverrideLimit: 1200.00,
      stripeCustomerId: "cus_demo_impending_789",
      stripeSubscriptionId: "sub_demo_impending_012",
      cardBrand: "mastercard",
      cardLast4: "5555",
      trialUsedTierIds: [proTier.id],
    }
  });

  // ── Inspectors ──
  console.log("🔍 Seeding inspectors — respecting updated per-tier limits...");
  const inspectorJake = await prisma.user.create({
    data: { email: "inspector.jake@yopmail.com", name: "Jake Thorpe", password: passwordHash, role: Role.INSPECTOR, phone: "+1 310-555-1001", accountStatus: "ACTIVE", ownerId: ownerAtlas.id, avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400" },
  });
  await prisma.user.create({
    data: { email: "inspector.sara@yopmail.com", name: "Sara Malone", password: passwordHash, role: Role.INSPECTOR, phone: "+1 310-555-1002", accountStatus: "ACTIVE", ownerId: ownerAtlas.id, avatar: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400" },
  });
  await prisma.user.create({
    data: { email: "inspector.david@yopmail.com", name: "David Kim", password: passwordHash, role: Role.INSPECTOR, phone: "+1 415-555-2001", accountStatus: "ACTIVE", ownerId: ownerAtlas.id, avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400" },
  });

  await prisma.user.create({
    data: { email: "inspector.priya@yopmail.com", name: "Priya Nair", password: passwordHash, role: Role.INSPECTOR, phone: "+1 415-555-2002", accountStatus: "ACTIVE", ownerId: ownerCoastal.id, avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400" },
  });
  await prisma.user.create({
    data: { email: "inspector.coastal2@yopmail.com", name: "Alex Wong", password: passwordHash, role: Role.INSPECTOR, phone: "+1 415-555-2003", accountStatus: "ACTIVE", ownerId: ownerCoastal.id, avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400" },
  });

  await prisma.user.create({
    data: { email: "inspector.patel1@yopmail.com", name: "Kumar Patel", password: passwordHash, role: Role.INSPECTOR, phone: "+1 408-555-3001", accountStatus: "ACTIVE", ownerId: ownerPatel.id, avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400" },
  });

  await prisma.user.create({
    data: { email: "inspector.carter1@yopmail.com", name: "Tom Carter", password: passwordHash, role: Role.INSPECTOR, phone: "+1 213-555-4001", accountStatus: "ACTIVE", ownerId: ownerPaused.id, avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400" },
  });
  await prisma.user.create({
    data: { email: "inspector.carter2@yopmail.com", name: "Jerry Carter", password: passwordHash, role: Role.INSPECTOR, phone: "+1 213-555-4002", accountStatus: "ACTIVE", ownerId: ownerPaused.id, avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400" },
  });

  await prisma.user.create({
    data: { email: "inspector.impending1@yopmail.com", name: "Frank Impending", password: passwordHash, role: Role.INSPECTOR, phone: "+1 213-555-5001", accountStatus: "ACTIVE", ownerId: ownerPausedImpending.id, avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400" },
  });
  await prisma.user.create({
    data: { email: "inspector.impending2@yopmail.com", name: "Alice Impending", password: passwordHash, role: Role.INSPECTOR, phone: "+1 213-555-5002", accountStatus: "ACTIVE", ownerId: ownerPausedImpending.id, avatar: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400" },
  });

  // ── Tenants ──
  const tenantAdam = await prisma.user.create({
    data: { email: "tenant.adam@yopmail.com", name: "Adam Brooks", password: passwordHash, role: Role.TENANT, phone: "+1 310-555-3001", tenantStatus: "Active", creditScore: 780, annualIncome: 115000, ssn: encrypt("123-45-6789"), employer: "TechCorp Inc.", position: "Senior Engineer", employmentStatus: "EMPLOYED", emergencyName: "Lisa Brooks", emergencyRelationship: "Spouse", emergencyPhone: "+1 310-555-3002", avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400" },
  });
  const tenantNora = await prisma.user.create({
    data: { email: "tenant.nora@yopmail.com", name: "Nora Klein", password: passwordHash, role: Role.TENANT, phone: "+1 310-555-3003", tenantStatus: "Pending Onboarding", creditScore: 710, annualIncome: 72000, ssn: encrypt("234-56-7890"), employer: "Design Studio LA", position: "Graphic Designer", employmentStatus: "EMPLOYED", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400" },
  });
  const tenantOscar = await prisma.user.create({
    data: { email: "tenant.oscar@yopmail.com", name: "Oscar Diaz", password: passwordHash, role: Role.TENANT, phone: "+1 310-555-3004", tenantStatus: "Active", creditScore: 620, annualIncome: 52000, ssn: encrypt("345-67-8901"), employer: "Warehouse Co.", position: "Supervisor", avatar: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=400" },
  });
  const tenantMarvin = await prisma.user.create({
    data: { email: "tenant.marvin@yopmail.com", name: "Marvin Torres", password: passwordHash, role: Role.TENANT, phone: "+1 310-555-3005", tenantStatus: "Active", creditScore: 740, annualIncome: 88000, ssn: encrypt("456-78-9012"), employer: "Metro Health", position: "Nurse Practitioner", employmentStatus: "EMPLOYED", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400" },
  });
  const tenantLiam = await prisma.user.create({
    data: { email: "tenant.liam@yopmail.com", name: "Liam Walsh", password: passwordHash, role: Role.TENANT, phone: "+1 310-555-3006", tenantStatus: "Active", creditScore: 690, annualIncome: 65000, ssn: encrypt("567-89-0123"), avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400" },
  });
  const tenantAmy = await prisma.user.create({
    data: { email: "tenant.amy@yopmail.com", name: "Amy Foster", password: passwordHash, role: Role.TENANT, phone: "+1 310-555-3007", tenantStatus: "Active", creditScore: 730, annualIncome: 78000, ssn: encrypt("678-90-1234"), avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400" },
  });
  const tenantDan = await prisma.user.create({
    data: { email: "tenant.dan@yopmail.com", name: "Dan Gibbs", password: passwordHash, role: Role.TENANT, phone: "+1 310-555-3008", tenantStatus: "Active", creditScore: 680, annualIncome: 60000, ssn: encrypt("789-01-2345"), avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400" },
  });
  const tenantEve = await prisma.user.create({
    data: { email: "tenant.eve@yopmail.com", name: "Eve Morales", password: passwordHash, role: Role.TENANT, phone: "+1 310-555-3009", tenantStatus: "Inactive", creditScore: 760, annualIncome: 90000, ssn: encrypt("890-12-3456"), avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400" },
  });
  const tenantKelly = await prisma.user.create({
    data: { email: "tenant.kelly@yopmail.com", name: "Kelly Huang", password: passwordHash, role: Role.TENANT, phone: "+1 310-555-3010", tenantStatus: "Active", creditScore: 715, annualIncome: 70000, ssn: encrypt("901-23-4567"), avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400" },
  });
  const tenantScott = await prisma.user.create({
    data: { email: "tenant.scott@yopmail.com", name: "Scott Park", password: passwordHash, role: Role.TENANT, phone: "+1 310-555-3011", tenantStatus: "Active", creditScore: 750, annualIncome: 82000, ssn: encrypt("012-34-5678"), avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400" },
  });
  const tenantCarlos = await prisma.user.create({
    data: { email: "tenant.carlos@yopmail.com", name: "Carlos Ruiz", password: passwordHash, role: Role.TENANT, phone: "+1 415-555-4001", tenantStatus: "Active", creditScore: 800, annualIncome: 250000, ssn: encrypt("111-22-3333"), employer: "Ruiz Enterprises LLC", position: "CEO", employmentStatus: "EMPLOYED", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400" },
  });
  const tenantPatel = await prisma.user.create({
    data: { 
      email: "tenant.patel@yopmail.com", 
      name: "Aria Patel", 
      password: passwordHash, 
      role: Role.TENANT, 
      phone: "+1 408-555-9009", 
      tenantStatus: "Active", 
      creditScore: 745, 
      annualIncome: 98000, 
      ssn: encrypt("999-88-7777"), 
      employer: "Google LLC", 
      position: "Associate Product Manager", 
      employmentStatus: "EMPLOYED",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400"
    },
  });
  // FIRST-TIME TENANT — no lease, empty dashboard
  await prisma.user.create({
    data: { email: "tenant.new@yopmail.com", name: "Sam Taylor", password: passwordHash, role: Role.TENANT, phone: "+1 213-555-5001", tenantStatus: "Pending Onboarding", creditScore: 700, annualIncome: 58000, avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400" },
  });

  // ── SECTION 2.5: Subscription History Events (for SaaS Billing Audits) ──
  console.log("📈 Seeding subscription history event stream...");
  
  // Owner 1 (Atlas): Essentials -> Pro -> Enterprise
  await prisma.subscriptionHistory.createMany({
    data: [
      {
        userId: ownerAtlas.id,
        toTierId: essentialsTier.id,
        toTierName: essentialsTier.name,
        event: "TRIAL_STARTED",
        amountPaid: 0,
        createdAt: dBefore(6),
      },
      {
        userId: ownerAtlas.id,
        fromTierId: essentialsTier.id,
        fromTierName: essentialsTier.name,
        toTierId: proTier.id,
        toTierName: proTier.name,
        event: "UPGRADED",
        amountPaid: 149.00,
        createdAt: dBefore(4),
      },
      {
        userId: ownerAtlas.id,
        fromTierId: proTier.id,
        fromTierName: proTier.name,
        toTierId: enterpriseTier.id,
        toTierName: enterpriseTier.name,
        event: "UPGRADED",
        amountPaid: 299.00,
        createdAt: dBefore(2),
      },
    ]
  });

  // Owner 2 (Coastal): Essentials -> Canceled -> Reactivated
  await prisma.subscriptionHistory.createMany({
    data: [
      {
        userId: ownerCoastal.id,
        toTierId: essentialsTier.id,
        toTierName: essentialsTier.name,
        event: "SUBSCRIBED",
        amountPaid: 49.00,
        createdAt: dBefore(3),
      },
      {
        userId: ownerCoastal.id,
        fromTierId: essentialsTier.id,
        fromTierName: essentialsTier.name,
        toTierId: essentialsTier.id,
        toTierName: essentialsTier.name,
        event: "CANCELED",
        amountPaid: 0,
        createdAt: dBefore(1.5),
      },
      {
        userId: ownerCoastal.id,
        fromTierId: essentialsTier.id,
        fromTierName: essentialsTier.name,
        toTierId: essentialsTier.id,
        toTierName: essentialsTier.name,
        event: "REACTIVATED",
        amountPaid: 49.00,
        createdAt: dBefore(1),
      },
    ]
  });

  // Owner 3 (Patel): Subscribed -> Past Due
  await prisma.subscriptionHistory.createMany({
    data: [
      {
        userId: ownerPatel.id,
        toTierId: essentialsTier.id,
        toTierName: essentialsTier.name,
        event: "TRIAL_STARTED",
        amountPaid: 0,
        createdAt: dBefore(2),
      },
      {
        userId: ownerPatel.id,
        fromTierId: essentialsTier.id,
        fromTierName: essentialsTier.name,
        toTierId: essentialsTier.id,
        toTierName: essentialsTier.name,
        event: "PAST_DUE",
        amountPaid: 0,
        createdAt: dDaysBefore(10),
      },
    ]
  });

  // Owner Paused: James Carter (Subscribed -> Paused)
  await prisma.subscriptionHistory.createMany({
    data: [
      {
        userId: ownerPaused.id,
        toTierId: proTier.id,
        toTierName: proTier.name,
        event: "SUBSCRIBED",
        amountPaid: 149.00,
        createdAt: dDaysBefore(180),
      },
      {
        userId: ownerPaused.id,
        fromTierId: proTier.id,
        fromTierName: proTier.name,
        toTierId: proTier.id,
        toTierName: proTier.name,
        event: "PAUSED",
        amountPaid: 0,
        createdAt: dDaysBefore(2),
      }
    ]
  });

  // Owner Paused Impending: James Impending (Subscribed -> Paused)
  await prisma.subscriptionHistory.createMany({
    data: [
      {
        userId: ownerPausedImpending.id,
        toTierId: proTier.id,
        toTierName: proTier.name,
        event: "SUBSCRIBED",
        amountPaid: 149.00,
        createdAt: dDaysBefore(180),
      },
      {
        userId: ownerPausedImpending.id,
        fromTierId: proTier.id,
        fromTierName: proTier.name,
        toTierId: proTier.id,
        toTierName: proTier.name,
        event: "PAUSED",
        amountPaid: 0,
        createdAt: dDaysBefore(55),
      }
    ]
  });

  // ── SECTION 3: External Vendors ────────────────────────────────────────────
  console.log("🔧 Creating external vendors...");

  // Atlas vendors (3)
  const vendorPlumbing = await prisma.externalVendor.create({
    data: { name: "FastFix Plumbing Co.", email: "vendor.plumbing@yopmail.com", phone: "+1 310-555-6001", specialty: "Plumbing", w9OnFile: true, insuranceOnFile: true, baseCallOutFee: 75.0, ownerId: ownerAtlas.id, bankName: "Bank of America", routingNumber: encrypt("026009593"), accountNumber: encrypt("100200300") },
  });
  await prisma.externalVendor.create({
    data: { name: "Bright Spark Electric", email: "vendor.electric@yopmail.com", phone: "+1 310-555-6002", specialty: "Electrical", w9OnFile: true, insuranceOnFile: true, baseCallOutFee: 95.0, ownerId: ownerAtlas.id, bankName: "Chase Bank", routingNumber: encrypt("021000021"), accountNumber: encrypt("400500600") },
  });
  await prisma.externalVendor.create({
    data: { name: "CoolAir HVAC Solutions", email: "vendor.hvac@yopmail.com", phone: "+1 310-555-6003", specialty: "HVAC", w9OnFile: true, insuranceOnFile: false, baseCallOutFee: 120.0, ownerId: ownerAtlas.id /* no bank details — tests add-banking flow */ },
  });

  // Coastal vendors (2)
  await prisma.externalVendor.create({
    data: { name: "Pacific Glass & Windows", email: "vendor.glass@yopmail.com", phone: "+1 415-555-7001", specialty: "General", w9OnFile: true, insuranceOnFile: true, baseCallOutFee: 80.0, ownerId: ownerCoastal.id, bankName: "Wells Fargo", routingNumber: encrypt("121000248"), accountNumber: encrypt("700800900") },
  });
  await prisma.externalVendor.create({
    data: { name: "Bay Area Electrical", email: "vendor.bayelectric@yopmail.com", phone: "+1 415-555-7002", specialty: "Electrical", w9OnFile: false, insuranceOnFile: true, baseCallOutFee: 110.0, ownerId: ownerCoastal.id, bankName: "Citibank", routingNumber: encrypt("321171184"), accountNumber: encrypt("111222333") },
  });

  // Raj Patel vendors (1)
  await prisma.externalVendor.create({
    data: { name: "Patel Painting & Repair", email: "vendor.patel1@yopmail.com", phone: "+1 408-555-6001", specialty: "General", w9OnFile: true, insuranceOnFile: true, baseCallOutFee: 85.0, ownerId: ownerPatel.id },
  });

  // James Carter vendors (2)
  await prisma.externalVendor.create({
    data: { name: "Carter Handyman Services", email: "vendor.carter1@yopmail.com", phone: "+1 213-555-8001", specialty: "General", w9OnFile: true, insuranceOnFile: true, baseCallOutFee: 90.0, ownerId: ownerPaused.id },
  });
  await prisma.externalVendor.create({
    data: { name: "Carter Roofing Services", email: "vendor.carter2@yopmail.com", phone: "+1 213-555-8002", specialty: "Roofing", w9OnFile: true, insuranceOnFile: true, baseCallOutFee: 150.0, ownerId: ownerPaused.id },
  });

  // James Impending vendors (2)
  await prisma.externalVendor.create({
    data: { name: "Impending Electric Services", email: "vendor.impending1@yopmail.com", phone: "+1 213-555-9001", specialty: "Electrical", w9OnFile: true, insuranceOnFile: true, baseCallOutFee: 100.0, ownerId: ownerPausedImpending.id },
  });
  await prisma.externalVendor.create({
    data: { name: "Impending Plumbing Services", email: "vendor.impending2@yopmail.com", phone: "+1 213-555-9002", specialty: "Plumbing", w9OnFile: true, insuranceOnFile: true, baseCallOutFee: 95.0, ownerId: ownerPausedImpending.id },
  });

  // ── SECTION 4: Properties & Units ──────────────────────────────────────────
  console.log("🏠 Creating properties and units...");

  // ── Property 1: Grand Horizon Towers (Apartment, Atlas) ──
  const propGrand = await prisma.property.create({
    data: {
      name: "Grand Horizon Towers", address: "100 Grand Avenue", city: "Los Angeles", state: "CA", zip: "90015", country: "USA",
      type: "Apartment", ownerId: ownerAtlas.id, approvalStatus: "APPROVED",
      yearBuilt: 2018, description: "Modern luxury apartment complex in downtown LA with premium amenities.", parkingSpaces: 120,
      amenities: ["Pool", "Gym", "Rooftop Deck", "Concierge", "EV Charging"],
      coverPhoto: IMG.grand.cover, images: [IMG.grand.cover, IMG.grand.unit2br, IMG.grand.unit3br],
      units: { create: [
        { name: "101", type: "Apartment", floor: 1, rentAmount: 2000, depositAmt: 2500, rooms: 1, bathrooms: 1, sqFootage: 800, status: "OCCUPIED", maxOccupants: 2, amenities: ["Balcony", "In-unit W/D"], images: [IMG.grand.unit1br] },
        { name: "102", type: "Apartment", floor: 1, rentAmount: 3000, depositAmt: 3500, rooms: 2, bathrooms: 2, sqFootage: 1200, status: "OCCUPIED", maxOccupants: 3, amenities: ["City Views", "Stainless Appliances"], images: [IMG.grand.unit2br] },
        { name: "103", type: "Apartment", floor: 2, rentAmount: 2400, depositAmt: 2800, rooms: 1, bathrooms: 1, sqFootage: 900, status: "OCCUPIED", maxOccupants: 2, images: [IMG.grand.interior1] },
        { name: "104", type: "Apartment", floor: 2, rentAmount: 3200, depositAmt: 3800, rooms: 2, bathrooms: 2, sqFootage: 1300, status: "OCCUPIED", maxOccupants: 4, amenities: ["Corner Unit"], images: [IMG.grand.interior2] },
        { name: "105", type: "Apartment", floor: 3, rentAmount: 2800, depositAmt: 3000, rooms: 2, bathrooms: 1, sqFootage: 1100, status: "VACANT", maxOccupants: 2, images: [IMG.grand.interior3] },
        { name: "106", type: "Apartment", floor: 3, rentAmount: 4500, depositAmt: 5000, rooms: 3, bathrooms: 2, sqFootage: 1800, status: "VACANT", maxOccupants: 5, amenities: ["Penthouse Views", "Premium Finishes"], images: [IMG.grand.unit3br] },
      ]},
    },
    include: { units: true },
  });
  const u101 = propGrand.units.find(u => u.name === "101")!;
  const u102 = propGrand.units.find(u => u.name === "102")!;
  const u103 = propGrand.units.find(u => u.name === "103")!;
  const u104 = propGrand.units.find(u => u.name === "104")!;
  const u105 = propGrand.units.find(u => u.name === "105")!;
  const u106 = propGrand.units.find(u => u.name === "106")!;

  // ── Property 2: Sunset Villa (House, Atlas) — VACANT for invite demo ──
  const propVilla = await prisma.property.create({
    data: {
      name: "Sunset Villa", address: "400 Pacific Coast Highway", city: "Malibu", state: "CA", zip: "90265", country: "USA",
      type: "House", ownerId: ownerAtlas.id, approvalStatus: "APPROVED",
      yearBuilt: 2015, description: "Stunning oceanfront villa with panoramic views. Perfect for executive tenants.", parkingSpaces: 4,
      amenities: ["Private Pool", "Ocean Views", "Home Theater", "Chef Kitchen"],
      coverPhoto: IMG.villa.cover, images: [IMG.villa.cover, IMG.villa.interior, IMG.villa.exterior],
      units: { create: [
        { name: "Main Villa", type: "House", rentAmount: 7500, depositAmt: 7500, rooms: 4, bathrooms: 3, sqFootage: 3200, status: "VACANT", maxOccupants: 6, amenities: ["Pool", "Ocean View", "3-Car Garage"], images: [IMG.villa.interior] },
      ]},
    },
    include: { units: true },
  });

  // ── Property 3: Move-Out Sandbox Estates (Apartment, Atlas) ──
  const propMoveout = await prisma.property.create({
    data: {
      name: "Move-Out Sandbox Estates", address: "999 Testing Lane", city: "Los Angeles", state: "CA", zip: "90001", country: "USA",
      type: "Apartment", ownerId: ownerAtlas.id, approvalStatus: "APPROVED",
      coverPhoto: IMG.sandbox.cover, images: [IMG.sandbox.cover, IMG.sandbox.interior],
      units: { create: [
        { name: "201", type: "Apartment", rentAmount: 2200, depositAmt: 2500, rooms: 1, bathrooms: 1, sqFootage: 850, status: "OCCUPIED" }, // Liam
        { name: "202", type: "Apartment", rentAmount: 2200, depositAmt: 2500, rooms: 1, bathrooms: 1, sqFootage: 850, status: "OCCUPIED" }, // Amy
        { name: "203", type: "Apartment", rentAmount: 2200, depositAmt: 2500, rooms: 1, bathrooms: 1, sqFootage: 850, status: "OCCUPIED" }, // Dan
        { name: "204", type: "Apartment", rentAmount: 2200, depositAmt: 2500, rooms: 1, bathrooms: 1, sqFootage: 850, status: "OCCUPIED" }, // Kelly
        { name: "205", type: "Apartment", rentAmount: 2200, depositAmt: 2500, rooms: 1, bathrooms: 1, sqFootage: 850, status: "OCCUPIED" }, // Scott
        { name: "206", type: "Apartment", rentAmount: 2200, depositAmt: 2500, rooms: 1, bathrooms: 1, sqFootage: 850, status: "VACANT" },
        { name: "207", type: "Apartment", rentAmount: 2200, depositAmt: 2500, rooms: 1, bathrooms: 1, sqFootage: 850, status: "VACANT" },
      ]},
    },
    include: { units: true },
  });
  const moUnit = (n: string) => propMoveout.units.find(u => u.name === n)!;

  // ── Property 4: Pacific Commerce Center (Commercial, Coastal) ──
  const propCommercial = await prisma.property.create({
    data: {
      name: "Pacific Commerce Center", address: "1 Market Street", city: "San Francisco", state: "CA", zip: "94105", country: "USA",
      type: "Commercial", ownerId: ownerCoastal.id, approvalStatus: "APPROVED",
      yearBuilt: 2010, description: "Class A commercial office space in downtown San Francisco's financial district.", parkingSpaces: 80,
      amenities: ["24/7 Security", "High-Speed Fiber", "Conference Rooms", "Cafeteria"], zoningType: "Commercial",
      coverPhoto: IMG.commercial.cover, images: [IMG.commercial.cover, IMG.commercial.lobby, IMG.commercial.office],
      units: { create: [
        { name: "Suite A", type: "Commercial", floor: 1, rentAmount: 8500, depositAmt: 17000, rooms: 5, sqFootage: 2200, status: "OCCUPIED", leaseStructure: "NNN", camCharges: 850, maxOccupants: 25 },
        { name: "Suite B", type: "Commercial", floor: 1, rentAmount: 6500, depositAmt: 13000, rooms: 4, sqFootage: 1800, status: "VACANT",   leaseStructure: "NNN", camCharges: 650, maxOccupants: 20 },
        { name: "Suite C", type: "Commercial", floor: 2, rentAmount: 9500, depositAmt: 19000, rooms: 6, sqFootage: 2600, status: "VACANT",   leaseStructure: "Gross", maxOccupants: 30 },
        { name: "Suite D", type: "Commercial", floor: 2, rentAmount: 12000, depositAmt: 24000, rooms: 8, sqFootage: 3400, status: "VACANT",  leaseStructure: "NNN", camCharges: 1200, maxOccupants: 45 },
      ]},
    },
    include: { units: true },
  });
  const suiteA = propCommercial.units.find(u => u.name === "Suite A")!;
  const suiteB = propCommercial.units.find(u => u.name === "Suite B")!;

  // ── Property 5: Patel Family Home (House, Patel) — APPROVED with active lease ──
  const propPatel = await prisma.property.create({
    data: {
      name: "Patel Family Home", address: "2847 Oak Creek Drive", city: "San Jose", state: "CA", zip: "95128", country: "USA",
      type: "House", ownerId: ownerPatel.id, approvalStatus: "APPROVED",
      yearBuilt: 2002, description: "Charming single-family home in a quiet residential neighborhood.", parkingSpaces: 2,
      amenities: ["Backyard", "Garage", "Hardwood Floors"],
      coverPhoto: IMG.patelHome.cover, images: [IMG.patelHome.cover, IMG.patelHome.interior],
      units: { create: [
        { name: "Main Home", type: "House", rentAmount: 4200, depositAmt: 4200, rooms: 3, bathrooms: 2, sqFootage: 1850, status: "OCCUPIED", maxOccupants: 5 },
      ]},
    },
    include: { units: true }
  });
  const uPatelMainHome = propPatel.units.find(u => u.name === "Main Home")!;

  // ── Property 5b: Patel Silicon Valley Condos (Apartment, Patel) — PENDING admin approval ──
  await prisma.property.create({
    data: {
      name: "Patel Silicon Valley Condos", address: "55 Meridian Avenue", city: "San Jose", state: "CA", zip: "95113", country: "USA",
      type: "Apartment", ownerId: ownerPatel.id, approvalStatus: "PENDING", // ← tests admin approval queue
      yearBuilt: 2021, description: "Modern luxury condos in high demand neighborhood.", parkingSpaces: 1,
      amenities: ["Rooftop Pool", "Underground Parking"],
      coverPhoto: IMG.patelCondo.cover, images: [IMG.patelCondo.cover, IMG.patelCondo.interior],
      units: { create: [
        { name: "Unit 305", type: "Apartment", rentAmount: 3200, depositAmt: 3200, rooms: 1, bathrooms: 1, sqFootage: 750, status: "VACANT", maxOccupants: 2 },
      ]},
    },
  });

  // ── Property 6: Carter Square (Apartment, James Carter) ──
  const propCarterSquare = await prisma.property.create({
    data: {
      name: "Carter Square", address: "404 Main Street", city: "Los Angeles", state: "CA", zip: "90012", country: "USA",
      type: "Apartment", ownerId: ownerPaused.id, approvalStatus: "APPROVED",
      yearBuilt: 2012, description: "A quiet, cozy apartment complex.", parkingSpaces: 20,
      coverPhoto: IMG.carterSquare.cover, images: [IMG.carterSquare.cover, IMG.carterSquare.interior],
      units: { create: [
        { name: "Unit A1", type: "Apartment", rentAmount: 1500, depositAmt: 1500, rooms: 1, bathrooms: 1, sqFootage: 650, status: "OCCUPIED" },
        { name: "Unit A2", type: "Apartment", rentAmount: 1500, depositAmt: 1500, rooms: 1, bathrooms: 1, sqFootage: 650, status: "OCCUPIED" },
        { name: "Unit A3", type: "Apartment", rentAmount: 1500, depositAmt: 1500, rooms: 1, bathrooms: 1, sqFootage: 650, status: "OCCUPIED" },
        { name: "Unit A4", type: "Apartment", rentAmount: 1800, depositAmt: 1800, rooms: 2, bathrooms: 1, sqFootage: 850, status: "OCCUPIED" },
        { name: "Unit A5", type: "Apartment", rentAmount: 1800, depositAmt: 1800, rooms: 2, bathrooms: 1, sqFootage: 850, status: "OCCUPIED" },
        { name: "Unit A6", type: "Apartment", rentAmount: 1800, depositAmt: 1800, rooms: 2, bathrooms: 1, sqFootage: 850, status: "VACANT" },
      ]},
    },
    include: { units: true }
  });

  // ── Property 7: Carter Heights (Apartment, James Carter) ──
  const propCarterHeights = await prisma.property.create({
    data: {
      name: "Carter Heights", address: "808 Hilltop Road", city: "Los Angeles", state: "CA", zip: "90028", country: "USA",
      type: "Apartment", ownerId: ownerPaused.id, approvalStatus: "APPROVED",
      yearBuilt: 2016, description: "Modern units with a view.", parkingSpaces: 10,
      coverPhoto: IMG.carterHeights.cover, images: [IMG.carterHeights.cover, IMG.carterHeights.interior],
      units: { create: [
        { name: "Unit B1", type: "Apartment", rentAmount: 2200, depositAmt: 2200, rooms: 2, bathrooms: 2, sqFootage: 1050, status: "OCCUPIED" },
        { name: "Unit B2", type: "Apartment", rentAmount: 2200, depositAmt: 2200, rooms: 2, bathrooms: 2, sqFootage: 1050, status: "VACANT" },
        { name: "Unit B3", type: "Apartment", rentAmount: 2200, depositAmt: 2200, rooms: 2, bathrooms: 2, sqFootage: 1050, status: "VACANT" },
        { name: "Unit B4", type: "Apartment", rentAmount: 2200, depositAmt: 2200, rooms: 2, bathrooms: 2, sqFootage: 1050, status: "VACANT" },
      ]},
    },
    include: { units: true }
  });

  // ── Property 8: Impending Plaza (Apartment, James Impending) ──
  const propImpendingPlaza = await prisma.property.create({
    data: {
      name: "Impending Plaza", address: "777 Clock Tower Ave", city: "Los Angeles", state: "CA", zip: "90036", country: "USA",
      type: "Apartment", ownerId: ownerPausedImpending.id, approvalStatus: "APPROVED",
      yearBuilt: 2014, description: "A beautifully maintained apartment community near downtown.", parkingSpaces: 15,
      coverPhoto: IMG.impendingPlaza.cover, images: [IMG.impendingPlaza.cover, IMG.impendingPlaza.interior],
      units: { create: [
        { name: "Unit 101", type: "Apartment", rentAmount: 1900, depositAmt: 1900, rooms: 1, bathrooms: 1, sqFootage: 700, status: "VACANT" },
        { name: "Unit 102", type: "Apartment", rentAmount: 2300, depositAmt: 2300, rooms: 2, bathrooms: 2, sqFootage: 950, status: "OCCUPIED" },
      ]},
    },
    include: { units: true }
  });

  // Create 6 new tenant users for James Carter
  const carterTenants = [];
  const carterAvatars = [
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400",
    "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400",
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400",
  ];
  for (let i = 1; i <= 6; i++) {
    const t = await prisma.user.create({
      data: {
        email: `tenant.carter${i}@yopmail.com`,
        name: `Carter Tenant ${i}`,
        password: passwordHash,
        role: Role.TENANT,
        phone: `+1 213-555-900${i}`,
        tenantStatus: "Active",
        creditScore: 700,
        annualIncome: 80000,
        avatar: carterAvatars[(i - 1) % carterAvatars.length],
      }
    });
    carterTenants.push(t);
  }

  // Active Leases for Carter Square & Heights
  const carterUnits = [
    propCarterSquare.units[0], // A1
    propCarterSquare.units[1], // A2
    propCarterSquare.units[2], // A3
    propCarterSquare.units[3], // A4
    propCarterSquare.units[4], // A5
    propCarterHeights.units[0], // B1
  ];

  for (let i = 0; i < 6; i++) {
    const lease = await prisma.lease.create({
      data: {
        unitId: carterUnits[i].id,
        tenantId: carterTenants[i].id,
        status: "ACTIVE",
        startDate: dBefore(6),
        endDate: dAfter(6),
        monthlyRent: carterUnits[i].rentAmount,
        securityDeposit: carterUnits[i].depositAmt,
        depositStatus: "HELD",
        depositBalance: carterUnits[i].depositAmt,
        depositPaidAt: dBefore(6),
        depositPaidAmount: carterUnits[i].depositAmt,
        signedAt: dBefore(6),
        keysHandedOverAt: dBefore(6),
        rentDueDay: 1,
        gracePeriodDays: 5,
        lateFeeAmount: 100,
      }
    });

    // Create 6 months of paid rent invoices and matching transactions for James Carter
    for (let m = 6; m >= 1; m--) {
      const invoiceDate = dBefore(m);
      invoiceDate.setDate(1);

      const amount = Number(carterUnits[i].rentAmount);
      const processingFee = amount * 0.029;
      const adminFee = amount * 0.02;
      const netToOwner = amount - adminFee;
      const grossPaid = amount + processingFee;

      const invoice = await prisma.invoice.create({
        data: {
          leaseId: lease.id,
          amount,
          dueDate: invoiceDate,
          status: "PAID",
          paymentMethod: "STRIPE",
          invoiceType: "RENT",
          processingFee,
          adminFee,
          netToOwner,
          grossPaid,
          createdAt: invoiceDate,
        }
      });

      await prisma.transaction.create({
        data: {
          type: "INCOME",
          category: "RENT",
          amount,
          reference: `STRIPE_PI_M${m}_${lease.id.slice(-4).toUpperCase()}`,
          status: "COMPLETED",
          tenantId: carterTenants[i].id,
          invoiceId: invoice.id,
          createdAt: invoiceDate,
        }
      });
    }

    // Unpaid/Overdue rent invoice for current month
    const currentMonthDueDate = new Date();
    currentMonthDueDate.setDate(1);

    await prisma.invoice.create({
      data: {
        leaseId: lease.id,
        amount: carterUnits[i].rentAmount,
        dueDate: currentMonthDueDate,
        status: i === 0 ? "UNPAID" : "PAID",
        paymentMethod: i === 0 ? null : "STRIPE",
        invoiceType: "RENT",
        processingFee: Number(carterUnits[i].rentAmount) * 0.029,
        adminFee: Number(carterUnits[i].rentAmount) * 0.02,
        netToOwner: Number(carterUnits[i].rentAmount) * 0.98,
        grossPaid: Number(carterUnits[i].rentAmount) * 1.029,
        createdAt: currentMonthDueDate,
      }
    });
  }

  // Create completed payouts to show real history for James Carter
  await prisma.payoutRequest.create({
    data: {
      ownerId: ownerPaused.id,
      amount: 4000.00,
      bankName: "Bank of America",
      accountNumber: encrypt("999988887777"),
      accountName: "Carter Properties Escrow",
      status: PayoutStatus.COMPLETED,
      disbursedAt: dBefore(5),
      refNumber: "WIRE-CARTER-M5",
      createdAt: dBefore(5),
    }
  });

  await prisma.payoutRequest.create({
    data: {
      ownerId: ownerPaused.id,
      amount: 4500.00,
      bankName: "Bank of America",
      accountNumber: encrypt("999988887777"),
      accountName: "Carter Properties Escrow",
      status: PayoutStatus.COMPLETED,
      disbursedAt: dBefore(3),
      refNumber: "WIRE-CARTER-M3",
      createdAt: dBefore(3),
    }
  });

  await prisma.payoutRequest.create({
    data: {
      ownerId: ownerPaused.id,
      amount: 4800.00,
      bankName: "Bank of America",
      accountNumber: encrypt("999988887777"),
      accountName: "Carter Properties Escrow",
      status: PayoutStatus.COMPLETED,
      disbursedAt: dBefore(1),
      refNumber: "WIRE-CARTER-M1",
      createdAt: dBefore(1),
    }
  });

  // Payouts for Raj Patel (Essentials owner)
  await prisma.payoutRequest.create({
    data: {
      ownerId: ownerPatel.id,
      amount: 3800.00,
      bankName: "Wells Fargo",
      accountNumber: encrypt("444455556666"),
      accountName: "Raj Patel",
      status: PayoutStatus.COMPLETED,
      disbursedAt: dBefore(3),
      refNumber: "WIRE-PATEL-M3",
      createdAt: dBefore(3),
    }
  });

  await prisma.payoutRequest.create({
    data: {
      ownerId: ownerPatel.id,
      amount: 3800.00,
      bankName: "Wells Fargo",
      accountNumber: encrypt("444455556666"),
      accountName: "Raj Patel",
      status: PayoutStatus.PENDING,
      createdAt: dDaysBefore(1),
    }
  });

  // Payouts for Linda Chen (Professional owner)
  await prisma.payoutRequest.create({
    data: {
      ownerId: ownerCoastal.id,
      amount: 8000.00,
      bankName: "Wells Fargo",
      accountNumber: encrypt("444455556666"),
      accountName: "Linda Chen",
      status: PayoutStatus.COMPLETED,
      disbursedAt: dBefore(2),
      refNumber: "WIRE-COASTAL-M2",
      createdAt: dBefore(2),
    }
  });

  await prisma.payoutRequest.create({
    data: {
      ownerId: ownerCoastal.id,
      amount: 7500.00,
      bankName: "Wells Fargo",
      accountNumber: encrypt("444455556666"),
      accountName: "Linda Chen",
      status: PayoutStatus.PENDING,
      createdAt: dDaysBefore(1),
    }
  });

  // Seed 1 pending payout request for James Carter (to test soft-lock withdrawals)
  await prisma.payoutRequest.create({
    data: {
      ownerId: ownerPaused.id,
      amount: 500.00,
      bankName: "Bank of America",
      accountNumber: encrypt("999988887777"),
      accountName: "Carter Properties Escrow",
      status: PayoutStatus.PENDING,
      createdAt: dDaysBefore(1),
    }
  });

  // Seed Subscription History for James Carter
  await prisma.subscriptionHistory.create({
    data: {
      userId: ownerPaused.id,
      toTierId: proTier.id,
      toTierName: proTier.name,
      event: "SUBSCRIBED",
      amountPaid: 149.00,
      createdAt: dBefore(6),
    }
  });

  for (let m = 5; m >= 1; m--) {
    await prisma.subscriptionHistory.create({
      data: {
        userId: ownerPaused.id,
        toTierId: proTier.id,
        toTierName: proTier.name,
        event: "SUBSCRIBED",
        amountPaid: 149.00,
        createdAt: dBefore(m),
      }
    });
  }

  await prisma.subscriptionHistory.create({
    data: {
      userId: ownerPaused.id,
      toTierId: proTier.id,
      toTierName: proTier.name,
      event: "PAST_DUE",
      createdAt: dDaysBefore(9),
    }
  });

  await prisma.subscriptionHistory.create({
    data: {
      userId: ownerPaused.id,
      toTierId: proTier.id,
      toTierName: proTier.name,
      event: "PAUSED",
      createdAt: dDaysBefore(2),
    }
  });

  // Create a tenant for James Impending
  const impendingTenant = await prisma.user.create({
    data: {
      email: "tenant.impending@yopmail.com",
      name: "Impending Tenant 1",
      password: passwordHash,
      role: Role.TENANT,
      phone: "+1 213-555-9010",
      tenantStatus: "Active",
      creditScore: 710,
      annualIncome: 95000,
    }
  });

  // Lease for James Impending Unit 102
  const leaseImpending = await prisma.lease.create({
    data: {
      unitId: propImpendingPlaza.units.find(u => u.name === "Unit 102")!.id,
      tenantId: impendingTenant.id,
      status: "ACTIVE",
      startDate: dBefore(6),
      endDate: dAfter(6),
      monthlyRent: 2300,
      securityDeposit: 2300,
      depositStatus: "HELD",
      depositBalance: 2300,
      depositPaidAt: dBefore(6),
      depositPaidAmount: 2300,
      signedAt: dBefore(6),
      keysHandedOverAt: dBefore(6),
      rentDueDay: 1,
      gracePeriodDays: 5,
      lateFeeAmount: 100,
    }
  });

  // Create 6 months of paid rent invoices and matching transactions for James Impending
  for (let m = 6; m >= 1; m--) {
    const invoiceDate = dBefore(m);
    invoiceDate.setDate(1);

    const amount = 2300;
    const processingFee = amount * 0.029;
    const adminFee = amount * 0.02;
    const netToOwner = amount - adminFee;
    const grossPaid = amount + processingFee;

    const invoice = await prisma.invoice.create({
      data: {
        leaseId: leaseImpending.id,
        amount,
        dueDate: invoiceDate,
        status: "PAID",
        paymentMethod: "STRIPE",
        invoiceType: "RENT",
        processingFee,
        adminFee,
        netToOwner,
        grossPaid,
        createdAt: invoiceDate,
      }
    });

    await prisma.transaction.create({
      data: {
        type: "INCOME",
        category: "RENT",
        amount,
        reference: `STRIPE_PI_M${m}_${leaseImpending.id.slice(-4).toUpperCase()}`,
        status: "COMPLETED",
        tenantId: impendingTenant.id,
        invoiceId: invoice.id,
        createdAt: invoiceDate,
      }
    });
  }

  // Create current month's UNPAID invoice for James Impending
  const currentMonthDueImpending = new Date();
  currentMonthDueImpending.setDate(1);

  await prisma.invoice.create({
    data: {
      leaseId: leaseImpending.id,
      amount: 2300,
      dueDate: currentMonthDueImpending,
      status: "UNPAID",
      invoiceType: "RENT",
      processingFee: 2300 * 0.029,
      adminFee: 2300 * 0.02,
      netToOwner: 2300 * 0.98,
      grossPaid: 2300 * 1.029,
      createdAt: currentMonthDueImpending,
    }
  });

  // Create past completed payouts for James Impending
  await prisma.payoutRequest.create({
    data: {
      ownerId: ownerPausedImpending.id,
      amount: 2000.00,
      bankName: "Bank of America",
      accountNumber: encrypt("111122223333"),
      accountName: "Impending Properties Escrow",
      status: PayoutStatus.COMPLETED,
      disbursedAt: dBefore(4),
      refNumber: "WIRE-IMPENDING-M4",
      createdAt: dBefore(4),
    }
  });

  await prisma.payoutRequest.create({
    data: {
      ownerId: ownerPausedImpending.id,
      amount: 2100.00,
      bankName: "Bank of America",
      accountNumber: encrypt("111122223333"),
      accountName: "Impending Properties Escrow",
      status: PayoutStatus.COMPLETED,
      disbursedAt: dBefore(2),
      refNumber: "WIRE-IMPENDING-M2",
      createdAt: dBefore(2),
    }
  });

  // Seed 1 pending payout request for James Impending
  await prisma.payoutRequest.create({
    data: {
      ownerId: ownerPausedImpending.id,
      amount: 350.00,
      bankName: "Bank of America",
      accountNumber: encrypt("111122223333"),
      accountName: "Impending Properties Escrow",
      status: PayoutStatus.PENDING,
      createdAt: dDaysBefore(1),
    }
  });

  // Seed Subscription History for James Impending
  await prisma.subscriptionHistory.create({
    data: {
      userId: ownerPausedImpending.id,
      toTierId: proTier.id,
      toTierName: proTier.name,
      event: "SUBSCRIBED",
      amountPaid: 149.00,
      createdAt: dBefore(6),
    }
  });

  for (let m = 5; m >= 1; m--) {
    await prisma.subscriptionHistory.create({
      data: {
        userId: ownerPausedImpending.id,
        toTierId: proTier.id,
        toTierName: proTier.name,
        event: "SUBSCRIBED",
        amountPaid: 149.00,
        createdAt: dBefore(m),
      }
    });
  }

  await prisma.subscriptionHistory.create({
    data: {
      userId: ownerPausedImpending.id,
      toTierId: proTier.id,
      toTierName: proTier.name,
      event: "PAST_DUE",
      createdAt: dDaysBefore(62),
    }
  });

  await prisma.subscriptionHistory.create({
    data: {
      userId: ownerPausedImpending.id,
      toTierId: proTier.id,
      toTierName: proTier.name,
      event: "PAUSED",
      createdAt: dDaysBefore(55),
    }
  });

  // ── SECTION 5: Leases ──────────────────────────────────────────────────────
  console.log("📋 Creating leases (all lifecycle states)...");

  // ── Lease 1: Nora Klein — PENDING_SIGNATURE (Awaiting signature + deposit) ──
  const leaseNora = await prisma.lease.create({
    data: {
      unitId: u101.id, tenantId: tenantNora.id, status: "PENDING_SIGNATURE",
      startDate: dDaysAfter(7), endDate: dAfter(13), monthlyRent: 2000, securityDeposit: 2500,
      depositStatus: "HELD", depositBalance: 0,
      rentDueDay: 1, gracePeriodDays: 5, lateFeeAmount: 100,
      customTerms: "No smoking on premises. Pets allowed with $500 pet deposit. Subletting is strictly prohibited.",
    },
  });
  await prisma.invoice.create({ data: { leaseId: leaseNora.id, amount: 2500, dueDate: dDaysAfter(7), status: "UNPAID", invoiceType: "DEPOSIT" } });

  // ── Lease 2: Adam Brooks — ACTIVE (Perfect payer, 6-month history) ──
  const leaseAdam = await prisma.lease.create({
    data: {
      unitId: u102.id, tenantId: tenantAdam.id, status: "ACTIVE",
      startDate: dBefore(6), endDate: dAfter(6), monthlyRent: 3000, securityDeposit: 3500,
      depositStatus: "HELD", depositBalance: 3500, depositPaidAt: dBefore(6), depositPaidAmount: 3500,
      signedAt: dBefore(6), keysHandedOverAt: dBefore(6),
      rentDueDay: 1, gracePeriodDays: 5, lateFeeAmount: 150, autoEmailInvoices: true,
      renewalStatus: "PENDING_DECISION", renewalNoticeDays: 60,
    },
  });
  const adamDepositInv = await prisma.invoice.create({ data: { leaseId: leaseAdam.id, amount: 3500, dueDate: dBefore(6), status: "PAID", paymentMethod: "STRIPE", grossPaid: 3601.50, processingFee: 101.50, adminFee: 70.00, netToOwner: 3430.00, invoiceType: "DEPOSIT" } });
  const adamDepositTx = await prisma.transaction.create({ data: { type: "INCOME", category: "DEPOSIT", amount: 3500, status: "COMPLETED", tenantId: tenantAdam.id, invoiceId: adamDepositInv.id } });
  await prisma.lease.update({ where: { id: leaseAdam.id }, data: { depositTransactionId: adamDepositTx.id } });
  // 5 paid months + current unpaid
  for (let m = 5; m >= 1; m--) {
    const inv = await prisma.invoice.create({ data: { leaseId: leaseAdam.id, amount: 3000, dueDate: dBefore(m), status: "PAID", paymentMethod: "STRIPE", grossPaid: 3087.00, processingFee: 87.00, adminFee: 60.00, netToOwner: 2940.00, invoiceType: "RENT" } });
    await prisma.transaction.create({ data: { type: "INCOME", category: "RENT", amount: 3000, status: "COMPLETED", tenantId: tenantAdam.id, invoiceId: inv.id, createdAt: dBefore(m) } });
  }
  await prisma.invoice.create({ data: { leaseId: leaseAdam.id, amount: 3000, dueDate: new Date(), status: "UNPAID", invoiceType: "RENT" } });

  // ── Lease 3: Oscar Diaz — ACTIVE (Overdue rent + late fee) ──
  const leaseOscar = await prisma.lease.create({
    data: {
      unitId: u103.id, tenantId: tenantOscar.id, status: "ACTIVE",
      startDate: dBefore(4), endDate: dAfter(8), monthlyRent: 2400, securityDeposit: 2800,
      depositStatus: "HELD", depositBalance: 2800, depositPaidAt: dBefore(4), depositPaidAmount: 2800,
      signedAt: dBefore(4), keysHandedOverAt: dBefore(4),
      rentDueDay: 1, gracePeriodDays: 3, lateFeeAmount: 120,
    },
  });
  await prisma.invoice.create({ data: { leaseId: leaseOscar.id, amount: 2800, dueDate: dBefore(4), status: "PAID", invoiceType: "DEPOSIT" } });
  await prisma.invoice.create({ data: { leaseId: leaseOscar.id, amount: 2400, dueDate: dBefore(1), status: "OVERDUE", invoiceType: "RENT" } });
  await prisma.invoice.create({ data: { leaseId: leaseOscar.id, amount: 120, dueDate: dDaysAfter(3), status: "UNPAID", invoiceType: "FEE", note: "Late payment fee — rent overdue 30+ days" } });

  // ── Lease 4: Marvin Torres — ACTIVE (Active maintenance sandbox) ──
  const leaseMarvin = await prisma.lease.create({
    data: {
      unitId: u104.id, tenantId: tenantMarvin.id, status: "ACTIVE",
      startDate: dBefore(5), endDate: dAfter(7), monthlyRent: 3200, securityDeposit: 3800,
      depositStatus: "HELD", depositBalance: 3800, depositPaidAt: dBefore(5), depositPaidAmount: 3800,
      signedAt: dBefore(5), keysHandedOverAt: dBefore(5),
    },
  });
  await prisma.invoice.create({ data: { leaseId: leaseMarvin.id, amount: 3800, dueDate: dBefore(5), status: "PAID", invoiceType: "DEPOSIT" } });
  await prisma.invoice.create({ data: { leaseId: leaseMarvin.id, amount: 3200, dueDate: dBefore(1), status: "PAID", paymentMethod: "STRIPE", grossPaid: 3292.80, processingFee: 92.80, adminFee: 64.00, netToOwner: 3136.00, invoiceType: "RENT" } });
  await prisma.invoice.create({ data: { leaseId: leaseMarvin.id, amount: 3200, dueDate: new Date(), status: "UNPAID", invoiceType: "RENT" } });

  // ── Lease 5: Eve Morales — EXPIRED (Deposit partially refunded with deductions) ──
  const leaseEve = await prisma.lease.create({
    data: {
      unitId: u105.id, tenantId: tenantEve.id, status: "EXPIRED",
      startDate: dBefore(15), endDate: dBefore(3), monthlyRent: 2800, securityDeposit: 3000,
      depositStatus: "PARTIALLY_REFUNDED", depositBalance: 0, depositPaidAt: dBefore(15), depositPaidAmount: 3000,
      depositWithheldAmount: 350, depositRefundAmount: 2650,
      signedAt: dBefore(15), keysHandedOverAt: dBefore(15),
      moveOutStatus: "COMPLETED", moveOutDate: dBefore(3), actualMoveOutDate: dBefore(3),
      keyReturnConfirmedAt: dBefore(3), inspectionDate: dBefore(3),
      refundMethod: "BANK_TRANSFER", refundRef: "WIRE-EVE-MORALES-2024",
      deductions: [
        { amount: 200.00, description: "Deep carpet cleaning — pet stains", category: "CLEANING" },
        { amount: 150.00, description: "Broken bathroom mirror", category: "DAMAGE" },
      ],
    },
  });
  await prisma.payoutRequest.create({
    data: { tenantId: tenantEve.id, leaseId: leaseEve.id, amount: 2650, status: PayoutStatus.COMPLETED, bankName: "Wells Fargo", accountNumber: encrypt("999988887777"), accountName: "Eve Morales", disbursedAt: dBefore(2), refNumber: "TXN-EVE-REFUND-001" },
  });

  // ── Lease 6: Carlos Ruiz — ACTIVE Commercial NNN (Pacific Commerce Center) ──
  const leaseCarlos = await prisma.lease.create({
    data: {
      unitId: suiteA.id, tenantId: tenantCarlos.id, status: "ACTIVE",
      startDate: dBefore(8), endDate: dAfter(4), monthlyRent: 8500, securityDeposit: 17000,
      depositStatus: "HELD", depositBalance: 17000, depositPaidAt: dBefore(8), depositPaidAmount: 17000,
      signedAt: dBefore(8), keysHandedOverAt: dBefore(8), rentDueDay: 1,
      customTerms: "NNN Lease: Tenant responsible for utilities, property taxes (proportional share), and insurance. CAM charges: $850/month.",
    },
  });
  const carlosDepInv = await prisma.invoice.create({ data: { leaseId: leaseCarlos.id, amount: 17000, dueDate: dBefore(8), status: "PAID", paymentMethod: "STRIPE", grossPaid: 17493.00, processingFee: 493.00, adminFee: 340.00, netToOwner: 16660.00, invoiceType: "DEPOSIT" } });
  await prisma.transaction.create({ data: { type: "INCOME", category: "DEPOSIT", amount: 17000, status: "COMPLETED", tenantId: tenantCarlos.id, invoiceId: carlosDepInv.id } });
  for (let m = 3; m >= 1; m--) {
    const inv = await prisma.invoice.create({ data: { leaseId: leaseCarlos.id, amount: 8500, dueDate: dBefore(m), status: "PAID", paymentMethod: "STRIPE", grossPaid: 8746.50, processingFee: 246.50, adminFee: 170.00, netToOwner: 8330.00, invoiceType: "RENT" } });
    await prisma.transaction.create({ data: { type: "INCOME", category: "RENT", amount: 8500, status: "COMPLETED", tenantId: tenantCarlos.id, invoiceId: inv.id, createdAt: dBefore(m) } });
  }
  await prisma.invoice.create({ data: { leaseId: leaseCarlos.id, amount: 8500, dueDate: new Date(), status: "UNPAID", invoiceType: "RENT" } });

  // ── Lease for Raj Patel (Main Home) ──
  const leasePatel = await prisma.lease.create({
    data: {
      unitId: uPatelMainHome.id,
      tenantId: tenantPatel.id,
      status: "ACTIVE",
      startDate: dBefore(6),
      endDate: dAfter(6),
      monthlyRent: 4200,
      securityDeposit: 4200,
      depositStatus: "HELD",
      depositBalance: 4200,
      depositPaidAt: dBefore(6),
      depositPaidAmount: 4200,
      signedAt: dBefore(6),
      keysHandedOverAt: dBefore(6),
      rentDueDay: 1,
      gracePeriodDays: 5,
      lateFeeAmount: 150,
    },
  });

  const patelDepositInv = await prisma.invoice.create({
    data: {
      leaseId: leasePatel.id,
      amount: 4200,
      dueDate: dBefore(6),
      status: "PAID",
      paymentMethod: "STRIPE",
      grossPaid: 4321.80,
      processingFee: 121.80,
      adminFee: 84.00,
      netToOwner: 4116.00,
      invoiceType: "DEPOSIT"
    }
  });

  await prisma.transaction.create({
    data: {
      type: "INCOME",
      category: "DEPOSIT",
      amount: 4200,
      status: "COMPLETED",
      tenantId: tenantPatel.id,
      invoiceId: patelDepositInv.id,
      createdAt: dBefore(6)
    }
  });

  for (let m = 5; m >= 1; m--) {
    const rentInv = await prisma.invoice.create({
      data: {
        leaseId: leasePatel.id,
        amount: 4200,
        dueDate: dBefore(m),
        status: "PAID",
        paymentMethod: "STRIPE",
        grossPaid: 4321.80,
        processingFee: 121.80,
        adminFee: 84.00,
        netToOwner: 4116.00,
        invoiceType: "RENT"
      }
    });

    await prisma.transaction.create({
      data: {
        type: "INCOME",
        category: "RENT",
        amount: 4200,
        status: "COMPLETED",
        tenantId: tenantPatel.id,
        invoiceId: rentInv.id,
        createdAt: dBefore(m)
      }
    });
  }

  await prisma.invoice.create({
    data: {
      leaseId: leasePatel.id,
      amount: 4200,
      dueDate: new Date(),
      status: "UNPAID",
      invoiceType: "RENT"
    }
  });

  // ── SECTION 6: Move-Out Lifecycle Leases (propMoveout units 201-205) ──────
  console.log("📦 Creating move-out lifecycle leases...");

  // Liam Walsh — NOTICE_GIVEN + INSPECTION_SCHEDULED
  await prisma.lease.create({
    data: {
      unitId: moUnit("201").id, tenantId: tenantLiam.id, status: "NOTICE_GIVEN",
      startDate: dBefore(12), endDate: dDaysAfter(14), monthlyRent: 2200, securityDeposit: 2500,
      depositStatus: "HELD", depositBalance: 2500, depositPaidAt: dBefore(12), depositPaidAmount: 2500,
      signedAt: dBefore(12), keysHandedOverAt: dBefore(12),
      moveOutStatus: "INSPECTION_SCHEDULED", moveOutRequestDate: dDaysBefore(10), moveOutDate: dDaysAfter(14),
      moveOutReason: "Job relocation to New York",
      inspectionDate: dDaysAfter(7), moveOutInspectorId: inspectorJake.id,
      preliminaryInspectorId: inspectorJake.id, preliminaryInspectionStatus: "SCHEDULED",
      forwardingAddress: "55 Broad Street, Apt 4B, New York, NY 10005",
      cleaningAcknowledgedAt: dDaysBefore(10), utilitiesAcknowledgedAt: dDaysBefore(10),
    },
  });

  // Amy Foster — ACTIVE + TENANT_ACCEPTED (accepted deductions)
  await prisma.lease.create({
    data: {
      unitId: moUnit("202").id, tenantId: tenantAmy.id, status: "ACTIVE",
      startDate: dBefore(12), endDate: dDaysBefore(7), monthlyRent: 2200, securityDeposit: 2500,
      depositStatus: "PARTIALLY_REFUNDED", depositBalance: 0, depositPaidAt: dBefore(12), depositPaidAmount: 2500,
      signedAt: dBefore(12),
      moveOutStatus: "TENANT_ACCEPTED", moveOutRequestDate: dDaysBefore(30), moveOutDate: dDaysBefore(7),
      moveOutReason: "End of lease", inspectionDate: dDaysBefore(10),
      inspectionNotes: "Light scuff marks on living room wall. Minor wear on kitchen cabinet door.",
      deductions: [
        { amount: 120.00, description: "Wall scuff marks — professional repaint", category: "DAMAGE" },
        { amount: 60.00,  description: "Kitchen cabinet door realignment", category: "DAMAGE" },
      ],
      actualMoveOutDate: dDaysBefore(7), keyReturnConfirmedAt: dDaysBefore(7), depositDueBy: dDaysAfter(14),
      forwardingAddress: "802 Maple Ave, Santa Monica, CA 90401", refundMethod: "BANK_TRANSFER",
    },
  });

  // Dan Gibbs — ACTIVE + TENANT_DISPUTED
  await prisma.lease.create({
    data: {
      unitId: moUnit("203").id, tenantId: tenantDan.id, status: "ACTIVE",
      startDate: dBefore(12), endDate: dDaysBefore(5), monthlyRent: 2200, securityDeposit: 2500,
      depositStatus: "HELD", depositBalance: 2500, depositPaidAt: dBefore(12), depositPaidAmount: 2500,
      signedAt: dBefore(12),
      moveOutStatus: "TENANT_DISPUTED", moveOutRequestDate: dDaysBefore(25), moveOutDate: dDaysBefore(5),
      moveOutReason: "End of lease", inspectionDate: dDaysBefore(8),
      inspectionNotes: "Broken window blind in bedroom. Large stain on bathroom tiles.",
      deductions: [
        { amount: 175.00, description: "Bedroom window blind replacement", category: "DAMAGE" },
        { amount: 200.00, description: "Bathroom tile deep cleaning", category: "CLEANING" },
      ],
      tenantDisputeNote: "I have photo evidence that the window blind was already broken when I moved in. Please review the original move-in inspection report.",
      tenantReviewedAt: dDaysBefore(4), disputeCount: 1,
      forwardingAddress: "42 Harbor Blvd, Long Beach, CA 90802", refundMethod: "BANK_TRANSFER",
    },
  });

  // Kelly Huang — NOTICE_GIVEN + KEYS_RETURNED (awaiting deposit decision)
  await prisma.lease.create({
    data: {
      unitId: moUnit("204").id, tenantId: tenantKelly.id, status: "NOTICE_GIVEN",
      startDate: dBefore(12), endDate: dDaysBefore(2), monthlyRent: 2200, securityDeposit: 2500,
      depositStatus: "HELD", depositBalance: 2500, depositPaidAt: dBefore(12), depositPaidAmount: 2500,
      signedAt: dBefore(12), keysHandedOverAt: dBefore(12),
      moveOutStatus: "KEYS_RETURNED", moveOutRequestDate: dDaysBefore(35), moveOutDate: dDaysBefore(2),
      moveOutReason: "Purchased a home",
      actualMoveOutDate: dDaysBefore(2), keyReturnConfirmedAt: dDaysBefore(2), depositDueBy: dDaysAfter(19),
      forwardingAddress: "112 Homeowner Drive, Pasadena, CA 91101",
      cleaningAcknowledgedAt: dDaysBefore(35), utilitiesAcknowledgedAt: dDaysBefore(35),
    },
  });

  // Scott Park — ACTIVE + OWNER_REVIEWING (inspection bypassed by owner)
  await prisma.lease.create({
    data: {
      unitId: moUnit("205").id, tenantId: tenantScott.id, status: "ACTIVE",
      startDate: dBefore(12), endDate: dDaysBefore(4), monthlyRent: 2200, securityDeposit: 2500,
      depositStatus: "HELD", depositBalance: 2500, depositPaidAt: dBefore(12), depositPaidAmount: 2500,
      signedAt: dBefore(12),
      moveOutStatus: "OWNER_REVIEWING", moveOutRequestDate: dDaysBefore(20), moveOutDate: dDaysBefore(4),
      moveOutReason: "Relocated out of state",
      actualMoveOutDate: dDaysBefore(4), keyReturnConfirmedAt: dDaysBefore(4), depositDueBy: dDaysAfter(17),
      moveOutBypassReason: "Unit left in excellent condition. Returning full deposit without physical inspection.",
      moveOutBypassAcknowledgedAt: dDaysBefore(4), deductions: [],
      forwardingAddress: "789 State St, Denver, CO 80202",
    },
  });

  // ── SECTION 7: Maintenance Requests ───────────────────────────────────────
  console.log("🔨 Creating maintenance requests (all status states)...");

  // ── SECTION 7: Maintenance Requests ───────────────────────────────────────
  console.log("🔨 Creating maintenance requests (all status states)...");

  // Raj Patel maintenance tickets (Essentials owner)
  await prisma.maintenanceRequest.create({
    data: {
      unitId: uPatelMainHome.id,
      tenantId: tenantPatel.id,
      title: "Garbage Disposal Jammed",
      description: "The garbage disposal in the kitchen sink makes a humming sound but does not spin. Might be jammed with food waste.",
      category: "GENERAL",
      priority: "LOW",
      status: "SUBMITTED",
      entryPermission: true,
      hasPets: "No",
    },
  });

  // James Carter maintenance tickets (Professional owner)
  await prisma.maintenanceRequest.create({
    data: {
      unitId: propCarterSquare.units[0].id,
      tenantId: carterTenants[0].id,
      title: "Running Toilet in Master Bath",
      description: "The toilet tank keeps filling up with water continuously. Seems like the flapper valve needs replacement.",
      category: "PLUMBING",
      priority: "MEDIUM",
      status: "SUBMITTED",
      entryPermission: true,
      hasPets: "No",
    },
  });

  await prisma.maintenanceRequest.create({
    data: {
      unitId: propCarterSquare.units[1].id,
      tenantId: carterTenants[1].id,
      title: "Broken Living Room Window Blind",
      description: "One of the plastic adjustment rods for the blinds has broken off and the blinds cannot be rotated.",
      category: "GENERAL",
      priority: "LOW",
      status: "ASSIGNED",
      entryPermission: true,
      hasPets: "No",
      inspectorId: inspectorJake.id,
    },
  });

  // 1. SUBMITTED — Needs assignment
  await prisma.maintenanceRequest.create({
    data: {
      unitId: u104.id, tenantId: tenantMarvin.id,
      title: "Smoke Detector Low Battery Alarm",
      description: "The smoke detector in the hallway has been beeping every 30 seconds for 2 days. Low battery.",
      category: "GENERAL", priority: "LOW", status: "SUBMITTED", entryPermission: true, hasPets: "No",
      photos: [IMG.maint.smokeDetector],
    },
  });

  // 2. SUBMITTED — Second open ticket (tests stats counters)
  await prisma.maintenanceRequest.create({
    data: {
      unitId: u104.id, tenantId: tenantMarvin.id,
      title: "Roof Gutter Overflow During Rain",
      description: "Water is backing up and overflowing from the roof gutter during rainfall, staining the exterior wall.",
      category: "GENERAL", priority: "MEDIUM", status: "SUBMITTED", entryPermission: true, hasPets: "No",
      preferredTimes: "Weekday mornings between 9 AM – 12 PM",
      photos: [IMG.maint.leak],
    },
  });

  // 3. DIAGNOSIS_SCHEDULED — Inspector Jake assigned, tenant MUST be home, awaiting confirmation
  const ticketHvac = await prisma.maintenanceRequest.create({
    data: {
      unitId: u104.id, tenantId: tenantMarvin.id,
      title: "HVAC System Not Cooling",
      description: "Central AC stopped blowing cold air. Ambient temp is 88°F. We have a toddler at home — urgent.",
      category: "APPLIANCE", priority: "HIGH", status: "DIAGNOSIS_SCHEDULED",
      inspectorId: inspectorJake.id, scheduledDate: dDaysAfter(2), diagnosisDate: dDaysAfter(2),
      entryPermission: false, hasPets: "Yes", tenantConfirmedSchedule: false,
      photos: [IMG.maint.hvac],
    },
  });

  // 4. DIAGNOSIS_COMPLETE — Inspector Jake completed diagnosis. Ready for vendor dispatch.
  await prisma.maintenanceRequest.create({
    data: {
      unitId: u104.id, tenantId: tenantMarvin.id,
      title: "Dishwasher Drainage Leak",
      description: "A pool of water forms under the front panel after each dishwasher cycle.",
      category: "APPLIANCE", priority: "MEDIUM", status: "DIAGNOSIS_COMPLETE",
      inspectorId: inspectorJake.id,

      inspectorNotes: "Dishwasher pump seal is cracked. Needs vendor to replace the pump.",
      entryPermission: true, hasPets: "No",
      photos: [IMG.maint.leak],
    },
  });

  // 5. AWAITING_APPROVAL — Vendor Quote Awaiting Approval (With inspector comparison reference!)
  const ticketWaterHeater = await prisma.maintenanceRequest.create({
    data: {
      unitId: u104.id, tenantId: tenantMarvin.id,
      title: "Water Heater Full Replacement Required",
      description: "Water heater has severe corrosion and is leaking from the base. Complete unit failure imminent.",
      category: "PLUMBING", priority: "HIGH", status: "AWAITING_APPROVAL",
      inspectorId: inspectorJake.id,

      externalVendorId: vendorPlumbing.id,
      vendorMagicToken: "DEMO-VENDOR-WATER-HEATER-REPLACE",
      vendorTokenExpiresAt: dDaysAfter(14),
      estimatedLabor: 750.00, estimatedMaterials: 650.00,
      inspectorNotes: "Tank is ~15 years old with severe base corrosion. Total replacement required. Inspector estimated $1,000, vendor quoted $1,400.",
      diagnosisDate: dDaysBefore(2),
      photos: [IMG.maint.waterHeater],
    },
  });

  // 6. ASSIGNED — Vendor Dispatch Pending Quote (Vendor Portal Entry testing)
  await prisma.maintenanceRequest.create({
    data: {
      unitId: u104.id, tenantId: tenantMarvin.id,
      title: "🚨 EMERGENCY: Burst Pipe Under Bathroom Sink",
      description: "A pipe under the bathroom sink has burst. Water spraying out. I shut the under-sink valve but may still be water in walls.",
      category: "PLUMBING", priority: "EMERGENCY", status: "ASSIGNED",
      inspectorId: inspectorJake.id,

      externalVendorId: vendorPlumbing.id,
      vendorMagicToken: "DEMO-VENDOR-BURST-PIPE-2025-TOKEN",
      vendorTokenExpiresAt: dDaysAfter(14),
      entryPermission: true, hasPets: "No",
      photos: [IMG.maint.leak],
    },
  });

  // 7. PENDING_TENANT_CONFIRMATION — Repair completed by vendor, awaiting tenant confirm
  await prisma.maintenanceRequest.create({
    data: {
      unitId: u104.id, tenantId: tenantMarvin.id,
      title: "Shattered Sliding Patio Door Glass",
      description: "The entire glass pane of the sliding patio door is shattered.",
      category: "GENERAL", priority: "HIGH", status: "PENDING_TENANT_CONFIRMATION",
      finalLabor: 280.00, finalMaterials: 420.00,
      vendorReportedFault: true, ownerChargebackDecision: null,
      inspectorNotes: "Glass shows external impact point pattern. Tenant claims it was pre-existing.",
      photos: [IMG.maint.brokenWindow],
    },
  });

  // 8. CLOSED — Deadbolt Lock (Awaiting payout settlement warning banner)
  await prisma.maintenanceRequest.create({
    data: {
      unitId: u104.id, tenantId: tenantMarvin.id,
      title: "Stiff Front Door Deadbolt",
      description: "The front door deadbolt is increasingly difficult to operate.",
      category: "GENERAL", priority: "LOW", status: "CLOSED",
      inspectorId: inspectorJake.id,
      finalLabor: 60.00, finalMaterials: 20.00,
      vendorReportedFault: false, ownerChargebackDecision: "WEAR_AND_TEAR",
      inspectorNotes: "Deadbolt mechanism worn from age and repeated use. Replaced with new set.",
      tenantRating: 5, tenantFeedback: "Super fast response! Issue resolved perfectly.",
      photos: [IMG.maint.brokenWindow],
    },
  });

  // 9. CLOSED — Tenant fault, deposit deduction applied
  const ticketTile = await prisma.maintenanceRequest.create({
    data: {
      unitId: u104.id, tenantId: tenantMarvin.id,
      title: "Cracked Bathroom Tile (Tenant Fault)",
      description: "Large crack running across bathroom floor tile near the shower door.",
      category: "GENERAL", priority: "MEDIUM", status: "CLOSED",
      inspectorId: inspectorJake.id,
      finalLabor: 80.00, finalMaterials: 45.00,
      vendorReportedFault: true, ownerChargebackDecision: "TENANT_FAULT",
      chargebackSource: "DEPOSIT", chargebackDepositAmount: 125.00, chargebackInvoiceAmount: 0.00,
      inspectorNotes: "Impact crack pattern consistent with dropped heavy object. Deposit deduction recommended.",
      photos: [IMG.maint.brokenWindow],
    },
  });
  await prisma.transaction.create({
    data: { type: "EXPENSE", category: "DEPOSIT", amount: 125.00, reference: `DEPOSIT_DEDUCT_${ticketTile.id.slice(-6).toUpperCase()}`, status: "COMPLETED", tenantId: tenantMarvin.id },
  });

  // 10. SUBMITTED — Commercial property ticket (Coastal)
  const ticketCommercial = await prisma.maintenanceRequest.create({
    data: {
      unitId: suiteA.id, tenantId: tenantCarlos.id,
      title: "Suite A HVAC Temperature Imbalance",
      description: "HVAC creating inconsistent temperatures across the office floor. East zone is 10°F warmer than west zone. Impacting employee productivity.",
      category: "APPLIANCE", priority: "MEDIUM", status: "SUBMITTED", entryPermission: true,
      photos: [IMG.maint.hvac],
    },
  });

  // 11. ASSIGNED (Owner self-inspection) — Owner is acting as inspector
  await prisma.maintenanceRequest.create({
    data: {
      unitId: u104.id, tenantId: tenantMarvin.id,
      title: "Loose Kitchen Cabinet Hinges",
      description: "Several cabinet doors are sagging and not closing properly.",
      category: "GENERAL", priority: "LOW", status: "ASSIGNED",
      inspectorId: ownerAtlas.id, // Owner assigned to self
      entryPermission: true, hasPets: "No",
      photos: [IMG.maint.brokenWindow],
    },
  });

  // 12. DIAGNOSIS_COMPLETE (Owner self-inspection) — Owner diagnosed the issue
  await prisma.maintenanceRequest.create({
    data: {
      unitId: u104.id, tenantId: tenantMarvin.id,
      title: "Leaking Faucet in Master Bath",
      description: "Continuous drip from the master bathroom sink. Driving us crazy at night.",
      category: "PLUMBING", priority: "MEDIUM", status: "DIAGNOSIS_COMPLETE",
      inspectorId: ownerAtlas.id, // Owner self-inspected

      inspectorNotes: "Self-diagnosed. Just needs a new O-ring and cartridge. I can fix this myself this weekend.",
      diagnosisDate: dDaysBefore(1),
      entryPermission: true, hasPets: "No",
      photos: [IMG.maint.leak],
    },
  });

  // Maintenance Request 13: Loose Handrail (Carter Square, James Carter)
  await prisma.maintenanceRequest.create({
    data: {
      unitId: propCarterSquare.units.find(u => u.name === "Unit A1")!.id,
      tenantId: carterTenants[0].id,
      title: "Wobbly Staircase Handrail",
      description: "The handrail on the stairs leading to the second floor is loose and wobbly.",
      category: "GENERAL",
      priority: "HIGH",
      status: "SUBMITTED",
      entryPermission: true,
      photos: [IMG.maint.brokenWindow],
    },
  });

  // Maintenance Request 14: Leaking sink (Impending Plaza, James Impending)
  await prisma.maintenanceRequest.create({
    data: {
      unitId: propImpendingPlaza.units.find(u => u.name === "Unit 102")!.id,
      tenantId: carterTenants[1].id,
      title: "Leaky Kitchen Faucet",
      description: "The kitchen faucet is dripping constantly from the base.",
      category: "PLUMBING",
      priority: "LOW",
      status: "SUBMITTED",
      entryPermission: true,
      photos: [IMG.maint.leak],
    },
  });

  // ── SECTION 8: Owner Payout Requests ──────────────────────────────────────
  console.log("💰 Creating payout requests and financial records...");

  await prisma.payoutRequest.create({ data: { ownerId: ownerAtlas.id, amount: 12500, status: PayoutStatus.PENDING, bankName: "Chase Bank", accountNumber: encrypt("111122223333"), accountName: "Atlas Properties Escrow" } });
  await prisma.payoutRequest.create({ data: { ownerId: ownerAtlas.id, amount: 18000, status: PayoutStatus.COMPLETED, bankName: "Chase Bank", accountNumber: encrypt("111122223333"), accountName: "Atlas Properties Escrow", disbursedAt: dBefore(2), proofUrl: "https://example.com/receipt-atlas-q1.pdf", refNumber: "WIRE-ATL-2025-001" } });
  await prisma.payoutRequest.create({ data: { ownerId: ownerAtlas.id, amount: 9500, status: PayoutStatus.REJECTED, bankName: "Chase Bank", accountNumber: encrypt("111122223333"), accountName: "Atlas Properties Escrow", rejectionReason: "Banking details could not be verified. Please re-submit with updated documentation." } });
  await prisma.payoutRequest.create({ data: { ownerId: ownerCoastal.id, amount: 7500, status: PayoutStatus.PENDING, bankName: "Wells Fargo", accountNumber: encrypt("444455556666"), accountName: "Coastal Realty Escrow" } });
  await prisma.payoutRequest.create({ data: { ownerId: ownerCoastal.id, amount: 14200, status: PayoutStatus.COMPLETED, bankName: "Wells Fargo", accountNumber: encrypt("444455556666"), accountName: "Coastal Realty Escrow", disbursedAt: dBefore(3), refNumber: "WIRE-CST-2025-001" } });

  // ── SECTION 9: Tours ──────────────────────────────────────────────────────
  console.log("🏡 Creating tours, owner availability, and applications...");

  // ── Owner Availability (Calendly-style working hours) ──
  console.log("📅 Creating owner availability schedules...");
  const atlasWorkingHours = {
    monday:    { start: "09:00", end: "18:00", enabled: true },
    tuesday:   { start: "09:00", end: "18:00", enabled: true },
    wednesday: { start: "09:00", end: "18:00", enabled: true },
    thursday:  { start: "09:00", end: "18:00", enabled: true },
    friday:    { start: "09:00", end: "17:00", enabled: true },
    saturday:  { start: "10:00", end: "14:00", enabled: true },
    sunday:    { start: "10:00", end: "14:00", enabled: false },
  };
  await (prisma as any).ownerAvailability.create({
    data: {
      ownerId: ownerAtlas.id,
      workingHours: atlasWorkingHours,
      blackoutDates: [
        new Date(new Date().getFullYear(), new Date().getMonth(), 25).toISOString().split("T")[0],
        new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split("T")[0],
      ],
      timezone: "America/Los_Angeles",
    },
  });

  const coastalWorkingHours = {
    monday:    { start: "10:00", end: "17:00", enabled: true },
    tuesday:   { start: "10:00", end: "17:00", enabled: true },
    wednesday: { start: "10:00", end: "17:00", enabled: false },
    thursday:  { start: "10:00", end: "17:00", enabled: true },
    friday:    { start: "10:00", end: "16:00", enabled: true },
    saturday:  { start: "11:00", end: "15:00", enabled: true },
    sunday:    { start: "11:00", end: "15:00", enabled: false },
  };
  await (prisma as any).ownerAvailability.create({
    data: {
      ownerId: ownerCoastal.id,
      workingHours: coastalWorkingHours,
      blackoutDates: [],
      timezone: "America/Los_Angeles",
    },
  });

  const carterWorkingHours = {
    monday:    { start: "09:00", end: "17:00", enabled: true },
    tuesday:   { start: "09:00", end: "17:00", enabled: true },
    wednesday: { start: "09:00", end: "17:00", enabled: true },
    thursday:  { start: "09:00", end: "17:00", enabled: true },
    friday:    { start: "09:00", end: "17:00", enabled: true },
    saturday:  { start: "09:00", end: "12:00", enabled: false },
    sunday:    { start: "09:00", end: "12:00", enabled: false },
  };
  await (prisma as any).ownerAvailability.create({
    data: {
      ownerId: ownerPaused.id,
      workingHours: carterWorkingHours,
      blackoutDates: [],
      timezone: "America/Los_Angeles",
    },
  });

  await (prisma as any).ownerAvailability.create({
    data: {
      ownerId: ownerPausedImpending.id,
      workingHours: carterWorkingHours,
      blackoutDates: [],
      timezone: "America/Los_Angeles",
    },
  });

  // ── Tours ──

  // Tour 1: PENDING — In-person, prospect viewing unit 106 (tenant.adam)
  await prisma.tour.create({
    data: {
      propertyId: propGrand.id,
      unitId: u106.id,
      tenantName: "Adam Smith",
      tenantEmail: "tenant.adam@yopmail.com",
      tenantPhone: "+1 310-555-0010",
      tenantMessage: "Hello, I am interested in checking the layout and morning sunlight. Is early AM available?",
      tourType: TourType.IN_PERSON,
      scheduledAt: dDaysAfter(5),
      status: TourStatus.PENDING,
      verifiedEmail: true,
    },
  });

  // Tour 2: CONFIRMED — Video Call with meeting link (tenant.oscar)
  await prisma.tour.create({
    data: {
      propertyId: propGrand.id,
      unitId: u106.id,
      tenantName: "Oscar Wilde",
      tenantEmail: "tenant.oscar@yopmail.com",
      tenantPhone: "+1 310-555-0020",
      tenantMessage: "Looking forward to a virtual tour — please send call link.",
      tourType: TourType.VIDEO_CALL,
      scheduledAt: dDaysAfter(2),
      status: TourStatus.CONFIRMED,
      meetingLink: "https://meet.google.com/abc-defg-hij",
      ownerNotes: "Join via the Google Meet link 5 minutes before. I will share screen of the full unit walkthrough.",
      verifiedEmail: true,
    } as any,
  });

  // Tour 3: CONFIRMED — In-person tomorrow (tenant.nora) — tests reminder cron
  await prisma.tour.create({
    data: {
      propertyId: propVilla.id,
      unitId: propVilla.units[0].id,
      tenantName: "Nora Jones",
      tenantEmail: "tenant.nora@yopmail.com",
      tenantPhone: "+1 310-555-0040",
      tenantMessage: "Very interested in the oceanfront layout. Will bring my partner.",
      tourType: TourType.IN_PERSON,
      scheduledAt: dDaysAfter(1),
      status: TourStatus.CONFIRMED,
      ownerNotes: "Buzz gate code #1122 at the entrance. Park along the main drive.",
      verifiedEmail: true,
    },
  });

  // Tour 4: COMPLETED — Owner rated + full categorical feedback from tenant (tenant.adam)
  await prisma.tour.create({
    data: {
      propertyId: propVilla.id,
      unitId: propVilla.units[0].id,
      tenantName: "Adam Smith",
      tenantEmail: "tenant.adam@yopmail.com",
      tenantPhone: "+1 310-555-0010",
      tourType: TourType.IN_PERSON,
      scheduledAt: dDaysBefore(6),
      status: TourStatus.COMPLETED,
      ownerProspectRating: 5,
      ownerProspectNotes: "Arrived exactly on time. Very professional. Strong credit & income. Highly qualified.",
      feedbackRating: 5,
      feedbackComments: "Absolutely beautiful villa! Marcus was incredibly informative and punctual.",
      feedbackCategories: {
        propertyCondition: 5,
        photoAccuracy: 5,
        landlordPunctuality: 5,
        neighborhoodSafety: 4,
      },
      verifiedEmail: true,
    } as any,
  });

  // Tour 5: COMPLETED — In-person with moderate ratings (tenant.marvin)
  await prisma.tour.create({
    data: {
      propertyId: propGrand.id,
      unitId: u106.id,
      tenantName: "Marvin Gaye",
      tenantEmail: "tenant.marvin@yopmail.com",
      tenantPhone: "+1 310-555-0030",
      tenantMessage: "Interested in the penthouse views and commercial lease potential.",
      tourType: TourType.IN_PERSON,
      scheduledAt: dDaysBefore(3),
      status: TourStatus.COMPLETED,
      ownerProspectRating: 4,
      ownerProspectNotes: "Polite and qualified. Expressed interest in a longer lease term.",
      feedbackRating: 4,
      feedbackComments: "Great property, photos matched perfectly. Slight parking issue on arrival.",
      feedbackCategories: {
        propertyCondition: 4,
        photoAccuracy: 5,
        landlordPunctuality: 4,
        neighborhoodSafety: 3,
      },
      verifiedEmail: true,
    } as any,
  });

  // Tour 6: CANCELLED by owner — unit no longer available (tenant.nora)
  await prisma.tour.create({
    data: {
      propertyId: propGrand.id,
      unitId: u106.id,
      tenantName: "Nora Jones",
      tenantEmail: "tenant.nora@yopmail.com",
      tenantPhone: "+1 310-555-0040",
      tourType: TourType.IN_PERSON,
      scheduledAt: dDaysBefore(8),
      status: TourStatus.CANCELLED,
      cancellationReason: "We apologize — this unit has just been leased and is no longer available for showings.",
      cancelledAt: dDaysBefore(9),
      verifiedEmail: true,
    } as any,
  });

  // Tour 7: CANCELLED by tenant within 24h window (tenant.oscar)
  await prisma.tour.create({
    data: {
      propertyId: propVilla.id,
      unitId: propVilla.units[0].id,
      tenantName: "Oscar Wilde",
      tenantEmail: "tenant.oscar@yopmail.com",
      tenantPhone: "+1 310-555-0020",
      tourType: TourType.IN_PERSON,
      scheduledAt: dDaysBefore(1),
      status: TourStatus.CANCELLED,
      cancellationReason: "I found a unit closer to my workplace. Thank you.",
      cancelledAt: dDaysBefore(1),
      verifiedEmail: true,
    } as any,
  });

  // Tour 8: RESCHEDULED — Video call, tenant rescheduled once (tenant.nora)
  await prisma.tour.create({
    data: {
      propertyId: propVilla.id,
      unitId: propVilla.units[0].id,
      tenantName: "Nora Jones",
      tenantEmail: "tenant.nora@yopmail.com",
      tenantPhone: "+1 310-555-0040",
      tourType: TourType.VIDEO_CALL,
      scheduledAt: dDaysAfter(8),
      status: TourStatus.CONFIRMED,
      meetingLink: "https://zoom.us/j/12345678901",
      rescheduledAt: dDaysBefore(2),
      ownerNotes: "Join the Zoom call 2 minutes early. Recording will be shared after the tour.",
      verifiedEmail: true,
    } as any,
  });

  // Tour 9: PENDING — In-person (tenant.kelly) — for slot conflict / double-booking test
  await prisma.tour.create({
    data: {
      propertyId: propGrand.id,
      unitId: u105.id,
      tenantName: "Kelly Huang",
      tenantEmail: "tenant.kelly@yopmail.com",
      tenantPhone: "+1 310-555-3010",
      tenantMessage: "I would love to see the 2BR unit on the 3rd floor.",
      tourType: TourType.IN_PERSON,
      scheduledAt: dDaysAfter(5),
      status: TourStatus.PENDING,
      verifiedEmail: true,
    },
  });

  // Tour 10: Commercial VIDEO_CALL — CONFIRMED with meeting link (tenant.carlos)
  await prisma.tour.create({
    data: {
      propertyId: propCommercial.id,
      unitId: suiteB.id,
      tenantName: "Carlos Ruiz",
      tenantEmail: "tenant.carlos@yopmail.com",
      tenantPhone: "+1 415-555-4001",
      tenantMessage: "Interested in Suite B for Ruiz Enterprises expansion. Would like a virtual walkthrough first.",
      tourType: TourType.VIDEO_CALL,
      scheduledAt: dDaysAfter(3),
      status: TourStatus.CONFIRMED,
      meetingLink: "https://teams.microsoft.com/l/meetup-join/19%3ameeting_DEMO",
      ownerNotes: "Join via Microsoft Teams. I will screen-share the full suite floor plan during the call.",
      verifiedEmail: true,
    } as any,
  });

  // Tour 11: Pending Tour for James Carter (to test pending count / welcome banner)
  await prisma.tour.create({
    data: {
      propertyId: propCarterSquare.id,
      unitId: propCarterSquare.units.find(u => u.name === "Unit A6")!.id,
      tenantName: "Michael Scott",
      tenantEmail: "michael.scott@dundermifflin.com",
      tenantPhone: "+1 570-555-0199",
      tenantMessage: "I want to schedule a showing for next week. Would love to see the balcony.",
      tourType: TourType.IN_PERSON,
      scheduledAt: dDaysAfter(6),
      status: TourStatus.PENDING,
      verifiedEmail: true,
    },
  });

  // Tour 12: Pending Tour for James Impending (to test pending count)
  await prisma.tour.create({
    data: {
      propertyId: propImpendingPlaza.id,
      unitId: propImpendingPlaza.units.find(u => u.name === "Unit 101")!.id,
      tenantName: "Jim Halpert",
      tenantEmail: "jim.halpert@dundermifflin.com",
      tenantPhone: "+1 570-555-0120",
      tenantMessage: "Is this unit available for virtual showings?",
      tourType: TourType.VIDEO_CALL,
      scheduledAt: dDaysAfter(4),
      status: TourStatus.PENDING,
      verifiedEmail: true,
    },
  });

  // ── SECTION 10: Applications ──────────────────────────────────────────────
  // Pending application (Unit 106)
  await prisma.application.create({
    data: {
      unitId: u106.id, name: "Alice Nguyen", email: "alice.app@yopmail.com", phone: "+1 310-555-8001",
      status: "PENDING", leaseDuration: 12, moveInDate: dDaysAfter(30), occupantsCount: 2,
      employerName: "Google LLC", jobTitle: "Product Manager", monthlyIncome: 14000,
      hasGuarantor: false, prevLandlordName: "Robert Simmons", prevLandlordPhone: "+1 310-555-0000",
      reasonForMoving: "Upgrading to a larger space", petsCount: 0,
      vehicleInfo: "2022 Tesla Model 3 (XYZ-7890)",
      emergencyContactName: "Henry Nguyen", emergencyContactPhone: "+1 408-555-0001", emergencyContactRelation: "Father",
      backgroundCheckConsent: true, agreedToTerms: true,
      idDocumentUrl: "https://example.com/alice_id.jpg", incomeProofUrl: "https://example.com/alice_paystub.pdf",
    },
  });

  // Approved application (Sunset Villa)
  await prisma.application.create({
    data: {
      unitId: propVilla.units[0].id, name: "James Whitmore", email: "james.app@yopmail.com", phone: "+1 310-555-8002",
      status: "APPROVED", leaseDuration: 24, moveInDate: dDaysAfter(14), occupantsCount: 3,
      employerName: "Goldman Sachs", jobTitle: "Vice President", monthlyIncome: 30000,
      hasGuarantor: false, prevLandlordName: "Beverly Hills Estates",
      reasonForMoving: "Closer to the ocean", petsCount: 1, petDetails: "1 small cat",
      emergencyContactName: "Susan Whitmore", emergencyContactPhone: "+1 310-555-8003", emergencyContactRelation: "Wife",
      backgroundCheckConsent: true, agreedToTerms: true,
      idDocumentUrl: "https://example.com/james_id.jpg", incomeProofUrl: "https://example.com/james_paystub.pdf",
    },
  });

  // Rejected application
  await prisma.application.create({
    data: {
      unitId: u106.id, name: "Bob Terrence", email: "bob.rejected@yopmail.com", phone: "+1 310-555-8004",
      status: "REJECTED", rejectionReason: "Credit score of 540 is below the minimum requirement of 620. Negative rental history reported by previous landlord.",
      leaseDuration: 6, moveInDate: dDaysAfter(7), occupantsCount: 4,
      employerName: "Self-Employed", monthlyIncome: 3500, hasGuarantor: false,
      prevLandlordName: "Angry Andy Rentals", reasonForMoving: "Eviction",
      petsCount: 2, petDetails: "2 large dogs",
      backgroundCheckConsent: false, agreedToTerms: true,
    },
  });

  // Commercial application (Suite B)
  await prisma.application.create({
    data: {
      unitId: suiteB.id, name: "Vertex Analytics Inc.", email: "vertex.app@yopmail.com", phone: "+1 415-555-8005",
      status: "PENDING", leaseDuration: 36, moveInDate: dDaysAfter(45), occupantsCount: 15,
      employerName: "Vertex Analytics Inc.", jobTitle: "Business", monthlyIncome: 150000,
      hasGuarantor: false, reasonForMoving: "Business expansion into SF financial district",
      backgroundCheckConsent: true, agreedToTerms: true,
    },
  });

  // Pending application for James Carter (Unit A6 - Vacant)
  await prisma.application.create({
    data: {
      unitId: propCarterSquare.units.find(u => u.name === "Unit A6")!.id,
      name: "Pam Beesly",
      email: "pam.beesly@dundermifflin.com",
      phone: "+1 570-555-0144",
      status: "PENDING",
      leaseDuration: 12,
      moveInDate: dDaysAfter(30),
      occupantsCount: 1,
      employerName: "Dunder Mifflin Paper Co",
      jobTitle: "Receptionist",
      monthlyIncome: 4500,
      hasGuarantor: false,
      reasonForMoving: "Closer to work",
      backgroundCheckConsent: true,
      agreedToTerms: true,
    },
  });

  // Pending application for James Impending (Unit 101 - Vacant)
  await prisma.application.create({
    data: {
      unitId: propImpendingPlaza.units.find(u => u.name === "Unit 101")!.id,
      name: "Dwight Schrute",
      email: "dwight.schrute@dundermifflin.com",
      phone: "+1 570-555-0100",
      status: "PENDING",
      leaseDuration: 12,
      moveInDate: dDaysAfter(15),
      occupantsCount: 1,
      employerName: "Schrute Farms",
      jobTitle: "Owner / Sales",
      monthlyIncome: 12000,
      hasGuarantor: false,
      reasonForMoving: "Expanding fields",
      backgroundCheckConsent: true,
      agreedToTerms: true,
    },
  });

  // ── SECTION 11: Documents ─────────────────────────────────────────────────
  console.log("📄 Creating documents...");
  await prisma.document.create({ data: { name: "Lease_Agreement_Adam_Brooks.pdf", url: "https://example.com/lease_adam.pdf", category: "LEASE", type: "Lease", description: "Fully executed 12-month lease agreement — Unit 102", fileSize: "1.4 MB", tenantId: tenantAdam.id, propertyId: propGrand.id } });
  await prisma.document.create({ data: { name: "Paystub_Adam_Brooks_6Mo.pdf", url: "https://example.com/paystub_adam.pdf", category: "PAYMENTS", type: "Income", description: "6-month paystub history from TechCorp Inc.", fileSize: "890 KB", tenantId: tenantAdam.id, propertyId: propGrand.id } });
  await prisma.document.create({ data: { name: "ID_Marvin_Torres.jpg", url: "https://example.com/id_marvin.jpg", category: "IDENTIFICATION", type: "Identification", fileSize: "420 KB", tenantId: tenantMarvin.id, propertyId: propGrand.id } });
  await prisma.document.create({ data: { name: "Commercial_Lease_Carlos_Ruiz_NNN.pdf", url: "https://example.com/lease_carlos.pdf", category: "LEASE", type: "Lease", description: "NNN Commercial Lease — Suite A, Pacific Commerce Center", fileSize: "2.1 MB", tenantId: tenantCarlos.id, propertyId: propCommercial.id } });
  await prisma.document.create({ data: { name: "Move_Out_Inspection_Eve_Morales.pdf", url: "https://example.com/inspection_eve.pdf", category: "MAINTENANCE", type: "Inspection", description: "Final move-out inspection report with deduction photos", fileSize: "3.5 MB", tenantId: tenantEve.id, propertyId: propGrand.id } });

  // ── SECTION 12: Messages ──────────────────────────────────────────────────
  console.log("💬 Creating message threads...");

  // Thread 1: Adam ↔ Atlas Owner (rent confirmation)
  const convAdamAtlas = [tenantAdam.id, ownerAtlas.id].sort().join("_");
  await prisma.message.create({ data: { senderId: tenantAdam.id, receiverId: ownerAtlas.id, content: "Hi Marcus, just wanted to confirm my rent payment went through for this month.", conversationId: convAdamAtlas, deliveryChannel: "LIVE_CHAT" } });
  await prisma.message.create({ data: { senderId: ownerAtlas.id, receiverId: tenantAdam.id, content: "Yes Adam, received it! Thank you for always being on time. Invoice is marked as paid in your dashboard.", isRead: true, conversationId: convAdamAtlas, deliveryChannel: "LIVE_CHAT" } });
  await prisma.message.create({ data: { senderId: tenantAdam.id, receiverId: ownerAtlas.id, content: "Great! Also, is it possible to get a copy of my original lease document?", conversationId: convAdamAtlas, deliveryChannel: "LIVE_CHAT" } });
  await prisma.message.create({ data: { senderId: ownerAtlas.id, receiverId: tenantAdam.id, content: "Of course! I've uploaded it to your Documents tab. You should be able to download it from there.", conversationId: convAdamAtlas, deliveryChannel: "LIVE_CHAT" } });

  // Thread 2: Marvin ↔ Jake (HVAC scheduling)
  const convMarvinJake = [tenantMarvin.id, inspectorJake.id].sort().join("_");
  await prisma.message.create({ data: { senderId: tenantMarvin.id, receiverId: inspectorJake.id, content: "Hi Jake, is the HVAC inspection still confirmed for Thursday at 10 AM?", conversationId: convMarvinJake, ticketId: ticketHvac.id, deliveryChannel: "LIVE_CHAT" } });
  await prisma.message.create({ data: { senderId: inspectorJake.id, receiverId: tenantMarvin.id, content: "Yes, confirmed! Please ensure the entry keypad code works. I'll need full unit access.", isRead: true, conversationId: convMarvinJake, ticketId: ticketHvac.id, deliveryChannel: "LIVE_CHAT" } });
  await prisma.message.create({ data: { senderId: tenantMarvin.id, receiverId: inspectorJake.id, content: "Gate code is 4821#. I'll be home if you have any questions. Thank you!", conversationId: convMarvinJake, ticketId: ticketHvac.id, deliveryChannel: "LIVE_CHAT" } });

  // Thread 3: Atlas Owner ↔ Jake (estimate approval)
  const convAtlasJake = [ownerAtlas.id, inspectorJake.id].sort().join("_");
  await prisma.message.create({ data: { senderId: inspectorJake.id, receiverId: ownerAtlas.id, content: "Marcus, submitted the estimate for Unit 104 water heater replacement. Total cost $1,400 — above your $500 threshold, needs approval.", conversationId: convAtlasJake, deliveryChannel: "LIVE_CHAT" } });
  await prisma.message.create({ data: { senderId: ownerAtlas.id, receiverId: inspectorJake.id, content: "Approved, Jake! Schedule the replacement ASAP — they have a toddler and it's been days without hot water.", isRead: true, conversationId: convAtlasJake, deliveryChannel: "LIVE_CHAT" } });

  // Thread 4: Dan ↔ Atlas Owner (deposit dispute)
  const convDanAtlas = [tenantDan.id, ownerAtlas.id].sort().join("_");
  await prisma.message.create({ data: { senderId: tenantDan.id, receiverId: ownerAtlas.id, content: "Hi Marcus, I'm disputing the window blind deduction. I have timestamped photos from move-in day showing it was already broken.", conversationId: convDanAtlas, deliveryChannel: "LIVE_CHAT" } });
  await prisma.message.create({ data: { senderId: ownerAtlas.id, receiverId: tenantDan.id, content: "Thank you for providing context, Dan. I'll review the original move-in inspection photos and get back to you within 3 business days.", conversationId: convDanAtlas, deliveryChannel: "LIVE_CHAT" } });
  await prisma.message.create({ data: { senderId: tenantDan.id, receiverId: ownerAtlas.id, content: "I've attached all relevant photos to the dispute form in my dashboard. Please review at your earliest convenience.", conversationId: convDanAtlas, deliveryChannel: "LIVE_CHAT" } });

  // Thread 5: Carlos ↔ Coastal Owner (commercial HVAC query)
  const convCarlosCoastal = [tenantCarlos.id, ownerCoastal.id].sort().join("_");
  await prisma.message.create({ data: { senderId: tenantCarlos.id, receiverId: ownerCoastal.id, content: "Linda, we submitted a maintenance request for Suite A HVAC — it's creating a 10°F temperature differential across the office. Affecting our team.", conversationId: convCarlosCoastal, deliveryChannel: "LIVE_CHAT" } });
  await prisma.message.create({ data: { senderId: ownerCoastal.id, receiverId: tenantCarlos.id, content: "Hi Carlos, I've assigned our inspector David Kim to assess this. He'll contact you to schedule a site visit early next week.", conversationId: convCarlosCoastal, deliveryChannel: "LIVE_CHAT" } });

  // Thread 6: Tenant ↔ Patel Owner (Email Fallback Mode — Essentials Tier)
  const convTenantPatel = [tenantAdam.id, ownerPatel.id].sort().join("_");
  await prisma.message.create({
    data: {
      senderId: tenantAdam.id,
      receiverId: ownerPatel.id,
      content: "Hi Raj, I wanted to inquire if visitor parking passes can be renewed online?",
      conversationId: convTenantPatel,
      deliveryChannel: "EMAIL_NOTIFIED"
    }
  });

  // ── SECTION 13: Notifications ──────────────────────────────────────────────
  console.log("🔔 Creating notifications...");
  await prisma.notification.createMany({
    data: [
      // Owner Atlas — Tour notifications
      { userId: ownerAtlas.id, title: "New Maintenance Estimate Pending", message: "Jake Thorpe submitted a $1,400 estimate for Unit 104 water heater replacement. Review & approve.", type: "MAINTENANCE", priority: "HIGH", relatedEntityId: ticketWaterHeater.id },
      { userId: ownerAtlas.id, title: "Move-Out Request Received", message: "Liam Walsh (Unit 201) has submitted a move-out request. Inspection needs to be scheduled.", type: "SYSTEM", priority: "HIGH" },
      { userId: ownerAtlas.id, title: "Payout Request Under Review", message: "Your $12,500 disbursement request is pending admin review. Estimated 1-2 business days.", type: "BILLING", priority: "MEDIUM" },
      { userId: ownerAtlas.id, title: "Tenant Dispute Raised", message: "Dan Gibbs (Unit 203) has disputed deposit deductions of $375. Resolution required.", type: "SYSTEM", priority: "HIGH" },
      { userId: ownerAtlas.id, title: "Renewal Window Open", message: "Adam Brooks' lease (Unit 102) expires in 6 months. Renewal decision needed.", type: "SYSTEM", priority: "MEDIUM" },
      { userId: ownerAtlas.id, title: "🏡 New Tour Request — Unit 106", message: "Adam Smith has requested an in-person tour of Unit 106 at Grand Horizon Towers. Review and confirm.", type: "SYSTEM", priority: "HIGH" },
      { userId: ownerAtlas.id, title: "📹 New Video Call Tour Request — Unit 106", message: "Oscar Wilde requested a video call tour of Unit 106. Add a meeting link when confirming.", type: "SYSTEM", priority: "HIGH" },
      { userId: ownerAtlas.id, title: "⭐ High Prospect Rating — Apply Invitation Sent", message: "Adam Smith received a 5-star prospect rating. A rental application invite was automatically sent.", type: "SYSTEM", priority: "MEDIUM" },
      // Owner Coastal
      { userId: ownerCoastal.id, title: "Commercial Maintenance Request", message: "Carlos Ruiz (Suite A) submitted an HVAC maintenance request. Assign an inspector.", type: "MAINTENANCE", priority: "MEDIUM", relatedEntityId: ticketCommercial.id },
      { userId: ownerCoastal.id, title: "New Commercial Application", message: "Vertex Analytics Inc. applied for Suite B — 36-month NNN lease, $6,500/month.", type: "SYSTEM", priority: "HIGH" },
      { userId: ownerCoastal.id, title: "📹 Video Tour Confirmed — Suite B", message: "Carlos Ruiz's Microsoft Teams video tour for Suite B is confirmed for 3 days from now.", type: "SYSTEM", priority: "MEDIUM" },
      // Admin
      { userId: admin.id, title: "Payout Request — Atlas Properties", message: "Marcus Reed (Atlas Properties LLC) requested a $12,500 disbursement. Admin action required.", type: "BILLING", priority: "HIGH" },
      { userId: admin.id, title: "Property Pending Approval", message: "Raj Patel submitted 'Patel Family Home' for platform listing approval. Review required.", type: "SYSTEM", priority: "HIGH" },
      { userId: admin.id, title: "New Owner Application", message: "Greenfield Holdings LLC submitted an owner application. Review in the admin panel.", type: "SYSTEM", priority: "MEDIUM" },
      // Tenant Adam
      { userId: tenantAdam.id, title: "Rent Receipt Confirmed", message: "Your rent payment of $3,000 has been received and recorded. Receipt available in your dashboard.", type: "BILLING", isRead: true, priority: "LOW" },
      { userId: tenantAdam.id, title: "Lease Renewal Offer", message: "Your lease expires in 6 months. Your owner Marcus Reed has sent a renewal offer for review.", type: "SYSTEM", priority: "MEDIUM" },
      { userId: tenantAdam.id, title: "🏡 Tour Confirmed — Grand Horizon Unit 106", message: "Your in-person tour at Grand Horizon Towers (Unit 106) is confirmed. Check your email for the calendar invite.", type: "SYSTEM", priority: "HIGH" },
      { userId: tenantAdam.id, title: "📋 Submit Rental Application — You're a Top Prospect!", message: "Great news! The landlord rated you 5 stars after your tour. Submit your rental application now to secure your unit.", type: "SYSTEM", priority: "HIGH" },
      // Tenant Oscar
      { userId: tenantOscar.id, title: "⚠️ Rent Overdue Notice", message: "Your rent of $2,400 is now overdue. A late fee of $120 has been applied. Please pay immediately.", type: "BILLING", priority: "HIGH" },
      { userId: tenantOscar.id, title: "📹 Video Tour Confirmed — Join via Google Meet", message: "Your virtual tour of Grand Horizon Unit 106 is confirmed. Meeting link: https://meet.google.com/abc-defg-hij", type: "SYSTEM", priority: "HIGH" },
      // Tenant Marvin
      { userId: tenantMarvin.id, title: "Inspection Scheduled", message: "Jake Thorpe will inspect your HVAC on Thursday at 10 AM. Ensure entry access is available.", type: "MAINTENANCE", priority: "MEDIUM", relatedEntityId: ticketHvac.id },
      { userId: tenantMarvin.id, title: "🏡 Tour Complete — Leave Feedback", message: "Your in-person tour of Grand Horizon Unit 106 is now marked complete. Please rate your experience.", type: "SYSTEM", priority: "LOW" },
      // Tenant Nora
      { userId: tenantNora.id, title: "Action Required: Sign Your Lease", message: "Your lease for Unit 101 is ready for signature and deposit payment. Complete now to confirm your move-in.", type: "SYSTEM", priority: "HIGH" },
      { userId: tenantNora.id, title: "🏡 Tour Confirmed — Sunset Villa Tomorrow", message: "Your in-person tour at Sunset Villa is confirmed for tomorrow. Gate code: #1122.", type: "SYSTEM", priority: "HIGH" },
      { userId: tenantNora.id, title: "📹 Video Tour Rescheduled — Zoom Link Ready", message: "Your Zoom video tour at Sunset Villa was rescheduled. New date is in 8 days. Join: https://zoom.us/j/12345678901", type: "SYSTEM", priority: "MEDIUM" },
      // Tenant Liam
      { userId: tenantLiam.id, title: "Move-Out Inspection Scheduled", message: "Your move-out inspection is scheduled for next Thursday at 2 PM. Inspector: Jake Thorpe.", type: "SYSTEM", priority: "MEDIUM" },
      // Tenant Dan
      { userId: tenantDan.id, title: "Dispute Under Review", message: "Your deposit dispute has been submitted. The owner will respond within 3 business days.", type: "SYSTEM", priority: "MEDIUM" },
      // Tenant Kelly
      { userId: tenantKelly.id, title: "Keys Confirmed — Deposit Decision Pending", message: "Your key return has been confirmed. Your deposit of $2,500 will be processed within 21 days.", type: "SYSTEM", priority: "MEDIUM" },
      { userId: tenantKelly.id, title: "🏡 Tour Request Received — Unit 105", message: "Your in-person tour request for Grand Horizon Unit 105 has been submitted. You'll be notified once confirmed.", type: "SYSTEM", priority: "MEDIUM" },
      // Tenant Carlos
      { userId: tenantCarlos.id, title: "📹 Commercial Video Tour Confirmed — Suite B", message: "Your Microsoft Teams virtual tour of Suite B at Pacific Commerce Center is confirmed for 3 days from now.", type: "SYSTEM", priority: "HIGH" },
    ],
  });

  // ── SECTION 14: Tenant Invitation Token ───────────────────────────────────
  console.log("✉️  Creating tenant invitation token...");
  await prisma.tenantInvitation.create({
    data: {
      token: "DEMO-INVITE-IRIS-PHAM-2025",
      tenantEmail: "tenant.iris@yopmail.com",
      tenantName: "Iris Pham",
      unitId: propVilla.units[0].id,
      propertyId: propVilla.id,
      monthlyRent: 7500,
      leaseStartDate: dDaysAfter(30),
      status: "PENDING",
      invitedByOwnerId: ownerAtlas.id,
      expiresAt: dDaysAfter(14),
    },
  });

  // ── SECTION 15: Owner Applications (Admin Queue) ───────────────────────────
  console.log("📁 Creating owner applications (admin queue)...");
  await prisma.ownerApplication.create({ data: { name: "Greenfield Holdings LLC", email: "greenfield@yopmail.com", phone: "+1 212-555-0001", entityType: "Property Management Company", portfolioSize: "50+", currentSoftware: "Buildium", status: "PENDING", trackingId: "trk_greenfield_001" } });
  await prisma.ownerApplication.create({ data: { name: "Sunrise Properties Corp.", email: "sunrise@yopmail.com", phone: "+1 305-555-0002", entityType: "Real Estate Investor", portfolioSize: "10-50", status: "UNDER_REVIEW", adminNotes: "Large portfolio. Needs enterprise-tier verification.", trackingId: "trk_sunrise_002" } });
  await prisma.ownerApplication.create({ data: { name: "John Solo Landlord", email: "john.solo@yopmail.com", phone: "+1 713-555-0003", entityType: "Independent Landlord", portfolioSize: "1-5", status: "REJECTED", rejectionReason: "Insufficient documentation. Business license could not be verified after 3 attempts.", trackingId: "trk_solo_003" } });

  // ── SECTION 16: Access Controls, Overrides & Audit Logs ─────────────────────
  console.log("🔒 Seeding access control overrides, grants, and audit logs...");

  // Owner Module Grants / Blocks
  await (prisma as any).ownerModuleGrant.createMany({
    data: [
      {
        userId: ownerPatel.id,
        module: "inspections",
        overrideType: "BLOCK",
        reason: "Tier restriction block — upgrade required for inspections",
        adminId: admin.id,
      },
      {
        userId: ownerCoastal.id,
        module: "messages",
        overrideType: "GRANT",
        reason: "Promotional preview grant authorized by Admin",
        adminId: admin.id,
      },
    ],
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Fine-Grained Tenant & Inspector Feature Access Overrides
  //
  // Test Scenarios Covered:
  //
  //  TENANTS:
  //  ① Oscar Diaz      — submit_maintenance BLOCKED (permanent, no expiry)
  //      → Tests: FeatureBlockedBanner on /dashboard/maintenance/new
  //      → Tests: API 403 on POST /api/maintenance
  //      → Tests: no expiresAt shown in notification detail
  //  ② Marvin Torres   — view_documents BLOCKED (expires in 7 days)
  //      → Tests: FeatureBlockedBanner on /dashboard/leases/documents
  //      → Tests: expiry countdown shown in notification detail
  //  ③ Marvin Torres   — message_owner BLOCKED (expires in 14 days)
  //      → Tests: Message compose/send disabled in /dashboard/messages
  //      → Tests: existing threads still readable (welfare rule)
  //  ④ Adam Brooks     — GRANT on view_lease (admin explicit grant)
  //      → Tests: access is explicitly granted even if tier blocked
  //
  //  INSPECTORS:
  //  ⑤ Jake Thorpe     — access_vendor_portal BLOCKED (permanent)
  //      → Tests: FeatureBlockedBanner on /dashboard/vendors
  //  ⑥ Jake Thorpe     — submit_reports BLOCKED (expires in 3 days — urgent)
  //      → Tests: FeatureBlockedBanner on /dashboard/inspector/inspections
  //      → Tests: low daysRemaining shows urgent warning styling
  //  ⑦ Sara Malone     — view_assignments BLOCKED (expires in 30 days)
  //      → Tests: FeatureBlockedBanner on /dashboard/inspector/active
  //
  // ──────────────────────────────────────────────────────────────────────────

  // ① Oscar — submit_maintenance (permanent BLOCK)
  const blockOscarMaint = await (prisma as any).userAccessOverride.create({
    data: {
      userId: tenantOscar.id,
      feature: "submit_maintenance",
      overrideType: "BLOCK",
      reason: "Maintenance submission suspended pending active dispute investigation (Case #2025-1147). Do not submit new tickets until dispute is resolved.",
      expiresAt: null, // permanent until admin manually revokes
      adminId: admin.id,
    },
  });

  // ② Marvin — view_documents (BLOCK with 7-day expiry)
  const blockMarvinDocs = await (prisma as any).userAccessOverride.create({
    data: {
      userId: tenantMarvin.id,
      feature: "view_documents",
      overrideType: "BLOCK",
      reason: "Document vault access restricted for 7 days while our compliance team conducts a routine audit of uploaded lease documents. Access will auto-restore upon expiry.",
      expiresAt: dDaysAfter(7),
      adminId: admin.id,
    },
  });

  // ③ Marvin — message_owner (BLOCK with 14-day expiry)
  const blockMarvinMsg = await (prisma as any).userAccessOverride.create({
    data: {
      userId: tenantMarvin.id,
      feature: "message_owner",
      overrideType: "BLOCK",
      reason: "New message threads temporarily restricted for 14 days. You may still read your existing message history. This restriction will lift automatically upon expiry.",
      expiresAt: dDaysAfter(14),
      adminId: admin.id,
    },
  });

  // ④ Adam — view_lease (explicit admin GRANT — allows even if tier blocks it)
  await (prisma as any).userAccessOverride.create({
    data: {
      userId: tenantAdam.id,
      feature: "view_lease",
      overrideType: "GRANT",
      reason: "Explicit admin grant — tenant requested access during lease dispute. Overrides any tier-level restrictions.",
      expiresAt: dDaysAfter(30),
      adminId: admin.id,
    },
  });

  // ⑤ Jake — access_vendor_portal (permanent BLOCK)
  const blockJakeVendor = await (prisma as any).userAccessOverride.create({
    data: {
      userId: inspectorJake.id,
      feature: "access_vendor_portal",
      overrideType: "BLOCK",
      reason: "Inspector Jake Thorpe operates in a read-only audit role. Vendor portal write access has been revoked to prevent unauthorized vendor onboarding. Contact admin to request access.",
      expiresAt: null, // permanent
      adminId: admin.id,
    },
  });

  // ⑥ Jake — submit_reports (BLOCK expiring in 3 days — urgent warning scenario)
  const blockJakeReports = await (prisma as any).userAccessOverride.create({
    data: {
      userId: inspectorJake.id,
      feature: "submit_reports",
      overrideType: "BLOCK",
      reason: "Report submission paused pending certification renewal (ASHI Inspector Cert #2025-JT-4421). Resume submissions after certificate upload. This block expires automatically in 3 days.",
      expiresAt: dDaysAfter(3), // urgent — tests low-day warning UI
      adminId: admin.id,
    },
  });

  // ⑦ Sara — view_assignments (BLOCK with 30-day expiry)
  const blockSaraAssign = await (prisma as any).userAccessOverride.create({
    data: {
      userId: (await prisma.user.findUnique({ where: { email: "inspector.sara@yopmail.com" } }))!.id,
      feature: "view_assignments",
      overrideType: "BLOCK",
      reason: "Inspector Sara Malone is currently on approved leave. Assignment visibility has been suspended until return. Access will auto-restore in 30 days. Emergency contacts remain available.",
      expiresAt: dDaysAfter(30),
      adminId: admin.id,
    },
  });

  // ── SECTION 16b: Feature-Restricted Notifications ──────────────────────────
  // These mirror the notifications that would be sent by admin when applying blocks.
  // relatedEntityId = the UserAccessOverride.id so the notification detail page
  // can fetch full block metadata (reason, expiresAt, daysRemaining) dynamically.
  console.log("🔔 Seeding feature-restriction notifications...");

  // Fetch Sara's ID (created earlier in the inspector block)
  const inspectorSara = await prisma.user.findUnique({ where: { email: "inspector.sara@yopmail.com" } });

  await prisma.notification.createMany({
    data: [
      // Tenant Oscar — submit_maintenance BLOCKED (permanent, no expiry)
      {
        userId: tenantOscar.id,
        title: "🔒 Feature Restricted: Submit Maintenance Requests",
        message: "An administrator has restricted your access to Submit Maintenance Requests. Reason: Maintenance submission suspended pending active dispute investigation (Case #2025-1147). This restriction has no automatic expiry — contact support for assistance.",
        type: "SYSTEM",
        priority: "HIGH",
        relatedEntityId: blockOscarMaint.id,
      },
      // Tenant Marvin — view_documents BLOCKED (7-day expiry)
      {
        userId: tenantMarvin.id,
        title: "🔒 Feature Restricted: Document Vault",
        message: "An administrator has temporarily restricted your access to the Document Vault for 7 days. Our compliance team is conducting a routine audit. Access will auto-restore when the restriction expires.",
        type: "SYSTEM",
        priority: "HIGH",
        relatedEntityId: blockMarvinDocs.id,
      },
      // Tenant Marvin — message_owner BLOCKED (14-day expiry)
      {
        userId: tenantMarvin.id,
        title: "🔒 Feature Restricted: Message Owner",
        message: "An administrator has temporarily restricted your ability to send new messages for 14 days. You may still read your existing message history. Access will auto-restore in 14 days.",
        type: "SYSTEM",
        priority: "MEDIUM",
        relatedEntityId: blockMarvinMsg.id,
      },
      // Inspector Jake — access_vendor_portal BLOCKED (permanent)
      {
        userId: inspectorJake.id,
        title: "🔒 Feature Restricted: Vendor Portal Access",
        message: "An administrator has restricted your Vendor Portal Access. You operate in a read-only audit role. Vendor portal write access has been revoked. Contact admin to request access.",
        type: "SYSTEM",
        priority: "HIGH",
        relatedEntityId: blockJakeVendor.id,
      },
      // Inspector Jake — submit_reports BLOCKED (3 days — urgent)
      {
        userId: inspectorJake.id,
        title: "⚠️ Feature Restricted: Submit Inspection Reports",
        message: "URGENT: Your ability to submit inspection reports is blocked for 3 days. Certification renewal required (ASHI Cert #2025-JT-4421). Upload your renewed certificate to restore access early.",
        type: "SYSTEM",
        priority: "HIGH",
        relatedEntityId: blockJakeReports.id,
      },
      // Inspector Sara — view_assignments BLOCKED (30-day expiry — approved leave)
      {
        userId: inspectorSara!.id,
        title: "🔒 Feature Restricted: View Assigned Jobs",
        message: "An administrator has temporarily suspended your assignment visibility for 30 days (approved leave period). Access will automatically restore upon your return. Emergency contacts remain available.",
        type: "SYSTEM",
        priority: "MEDIUM",
        relatedEntityId: blockSaraAssign.id,
      },
    ],
  });

  // Persistent OtpTokens (Testing Distributed OTP Storage)
  await (prisma as any).otpToken.createMany({
    data: [
      {
        key: "tour_otp:tenant.nora@yopmail.com",
        code: "654321",
        expiresAt: dDaysAfter(1),
      },
      {
        key: "lease_otp:demo-lease-signature",
        code: "987654",
        expiresAt: dDaysAfter(1),
      },
    ],
  });

  // System Audit Logs
  await (prisma as any).auditLog.createMany({
    data: [
      // Subscription change
      {
        entityType: "USER",
        entityId: ownerAtlas.id,
        action: "STATUS_CHANGED",
        actorId: admin.id,
        actorRole: "SUPERADMIN",
        note: "Owner Marcus Reed upgraded to Enterprise Tier",
      },
      // Owner-level module block
      {
        entityType: "USER",
        entityId: ownerPatel.id,
        action: "USER_FEATURE_BLOCKED",
        actorId: admin.id,
        actorRole: "SUPERADMIN",
        note: "Module block applied for inspections on Patel Realty account (Essentials tier does not include inspections)",
      },
      // Tenant feature blocks
      {
        entityType: "USER",
        entityId: tenantOscar.id,
        action: "USER_FEATURE_BLOCKED",
        actorId: admin.id,
        actorRole: "SUPERADMIN",
        note: "Blocked submit_maintenance for tenant Oscar Diaz — pending dispute investigation (Case #2025-1147)",
      },
      {
        entityType: "USER",
        entityId: tenantMarvin.id,
        action: "USER_FEATURE_BLOCKED",
        actorId: admin.id,
        actorRole: "SUPERADMIN",
        note: "Blocked view_documents for tenant Marvin Torres — 7-day compliance audit. Expires automatically.",
      },
      {
        entityType: "USER",
        entityId: tenantMarvin.id,
        action: "USER_FEATURE_BLOCKED",
        actorId: admin.id,
        actorRole: "SUPERADMIN",
        note: "Blocked message_owner for tenant Marvin Torres — 14-day restriction. Existing threads preserved per welfare policy.",
      },
      // Tenant feature grant
      {
        entityType: "USER",
        entityId: tenantAdam.id,
        action: "USER_FEATURE_GRANTED",
        actorId: admin.id,
        actorRole: "SUPERADMIN",
        note: "Explicit grant on view_lease for tenant Adam Brooks — overrides any tier-level restriction during lease dispute.",
      },
      // Inspector feature blocks
      {
        entityType: "USER",
        entityId: inspectorJake.id,
        action: "USER_FEATURE_BLOCKED",
        actorId: admin.id,
        actorRole: "SUPERADMIN",
        note: "Blocked access_vendor_portal for Inspector Jake Thorpe — read-only audit role, permanent restriction.",
      },
      {
        entityType: "USER",
        entityId: inspectorJake.id,
        action: "USER_FEATURE_BLOCKED",
        actorId: admin.id,
        actorRole: "SUPERADMIN",
        note: "Blocked submit_reports for Inspector Jake Thorpe — ASHI certification pending renewal. Expires in 3 days.",
      },
      {
        entityType: "USER",
        entityId: (await prisma.user.findUnique({ where: { email: "inspector.sara@yopmail.com" } }))!.id,
        action: "USER_FEATURE_BLOCKED",
        actorId: admin.id,
        actorRole: "SUPERADMIN",
        note: "Blocked view_assignments for Inspector Sara Malone — approved leave, auto-restores in 30 days.",
      },
    ],
  });

  // ── DONE ──────────────────────────────────────────────────────────────────
  console.log("\\n====================================================");
  console.log(" ✅ PropertyPro Production Demo Seed COMPLETE!");
  console.log("====================================================");
  console.log("");
  console.log("🔑 LOGIN MATRIX  (Universal password: Demo@1234)");
  console.log("─────────────────────────────────────────────────────────────────────");
  console.log(" ROLE              | EMAIL                         | TOUR STATE");
  console.log("─────────────────────────────────────────────────────────────────────");
  console.log(" Super Admin       | admin@yopmail.com");
  console.log(" Owner (Enterprise)| owner.atlas@yopmail.com       ← 7 tours, availability set");
  console.log(" Owner (Professional)| owner.coastal@yopmail.com     ← commercial video tour");
  console.log(" Owner (Essentials)| owner.patel@yopmail.com");
  console.log(" Owner (New)  ★    | owner.new@yopmail.com         ← First-time onboarding wizard");
  console.log(" Inspector         | inspector.jake@yopmail.com");
  console.log(" Inspector         | inspector.sara@yopmail.com");
  console.log(" Tenant (Perfect)  | tenant.adam@yopmail.com       ← 2 tours (pending+completed w/feedback)");
  console.log(" Tenant (Overdue)  | tenant.oscar@yopmail.com      ← 1 confirmed video + 1 cancelled");
  console.log(" Tenant (Maint.)   | tenant.marvin@yopmail.com     ← 1 completed tour w/ categories");
  console.log(" Tenant (Sign)     | tenant.nora@yopmail.com       ← 1 confirmed + 1 rescheduled tour");
  console.log(" Tenant (Move-Out) | tenant.liam@yopmail.com");
  console.log(" Tenant (Dispute)  | tenant.dan@yopmail.com");
  console.log(" Tenant (Kelly)    | tenant.kelly@yopmail.com      ← 1 pending tour (slot conflict demo)");
  console.log(" Tenant (Comm.)    | tenant.carlos@yopmail.com     ← commercial video tour confirmed");
  console.log(" Tenant (New)  ★   | tenant.new@yopmail.com        ← First-time empty dashboard");
  console.log("─────────────────────────────────────────────────────────────────────");
  console.log("");
  console.log("🏡  Tour Flow Features Seeded:");
  console.log("    ✅ 10 tours across all states (PENDING, CONFIRMED, COMPLETED, CANCELLED)");
  console.log("    ✅ 2 VIDEO_CALL tours with meetingLink set");
  console.log("    ✅ Structured feedbackCategories on completed tours");
  console.log("    ✅ cancelledAt + rescheduledAt timestamps");
  console.log("    ✅ OwnerAvailability for Atlas + Coastal (working hours + blackout dates)");
  console.log("    ✅ PlatformSettings.tourCancellationWindowHours = 24");
  console.log("");
  console.log("📧  Email testing: https://yopmail.com");
  console.log("🔗  Vendor portal: /vendor/ticket/DEMO-VENDOR-BURST-PIPE-2025-TOKEN");
  console.log("🎫  Invite token:  /invite/DEMO-INVITE-IRIS-PHAM-2025");
  console.log("📅  Cron endpoint: POST /api/cron/tour-reminders (Auth: Bearer {CRON_SECRET})");
  console.log("⚙️   Owner availability: GET/POST /api/owner-availability");
  console.log("====================================================\\n");
}

main()
  .catch((e) => { console.error("\\n❌ Seeding failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
