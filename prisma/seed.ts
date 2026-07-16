import "dotenv/config";
import { PrismaClient, Role, PayoutStatus, TourType, TourStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

// ─── Encryption Setup ─────────────────────────────────────────────────────────
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const ENCRYPTION_KEY = (() => {
  const keyStr = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || "default-fallback-secret-propertypro-32-chars";
  return crypto.scryptSync(keyStr, "propertypro-salt", 32);
})();

function encrypt(text: string): string {
  if (!text) return "";
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

// ─── Image URL Constants (Unsplash) ──────────────────────────────────────────
const IMG = {
  apartment: {
    cover:     "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200",
    unit1br:   "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200",
    unit2br:   "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200",
    unit3br:   "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200",
    interior1: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200",
    interior2: "https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=1200",
    interior3: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200",
  },
  house: {
    cover:    "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200",
    interior: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200",
    exterior: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200",
  },
  commercial: {
    cover:  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200",
    lobby:  "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200",
    office: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200",
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
  console.log(" PropertyPro — Production Demo Seeder v2.0");
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
  await prisma.tour.deleteMany();
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

  // ── SECTION 1: Platform Settings & Pricing Tiers ──────────────────────────
  console.log("⚙️  Creating platform settings and pricing tiers...");
  await prisma.platformSettings.create({ data: { adminFeePercent: 2.00 } });

  const tiers = await Promise.all([
    prisma.pricingTier.create({ data: { name: "Hobbyist", description: "Landlords just starting out", price: 0, minUnits: 1, maxUnits: 2, features: ["Up to 2 Units", "Basic Reporting"] } }),
    prisma.pricingTier.create({ data: { name: "Starter", description: "Independent landlords", price: 29, minUnits: 3, maxUnits: 15, features: ["Up to 15 Units", "Ticketing", "Tenant Portal"] } }),
    prisma.pricingTier.create({ data: { name: "Professional", description: "Growing portfolio management", price: 79, minUnits: 16, maxUnits: 50, features: ["Up to 50 Units", "Priority Support", "Financial Reports", "Vendor Management"] } }),
    prisma.pricingTier.create({ data: { name: "Enterprise", description: "Large-scale property companies", price: 149, minUnits: 51, maxUnits: 9999, features: ["Unlimited Units", "Custom API", "Dedicated Account Manager", "White-Label Options"], isCustom: true } }),
  ]);
  const [hobbyistTier, starterTier, proTier] = tiers;

  // ── SECTION 2: Users ───────────────────────────────────────────────────────
  console.log("👤 Creating users (admin, owners, inspectors, tenants)...");
  const passwordHash = await bcrypt.hash("Demo@1234", 10);

  // ── Admin ──
  const admin = await prisma.user.create({
    data: { email: "admin@yopmail.com", name: "System Admin", password: passwordHash, role: Role.SUPERADMIN, accountStatus: "ACTIVE" },
  });

  // ── Owners ──
  // Owner 1: Marcus Reed — Atlas Properties LLC (Professional tier, full portfolio)
  const ownerAtlas = await prisma.user.create({
    data: {
      email: "owner.atlas@yopmail.com", name: "Marcus Reed", password: passwordHash, role: Role.OWNER,
      phone: "+1 310-555-0100",
      bankName: "Chase Bank", accountNumber: encrypt("111122223333"), accountName: "Atlas Properties Escrow",
      balance: 28750.50,
      currentTierId: proTier.id, subscriptionStatus: "Active", accountStatus: "ACTIVE",
      creditScore: 800, hasCompletedOnboarding: true, onboardingStep: 4,
      approvalThreshold: 500.00, emergencyOverrideLimit: 2000.00,
    },
  });

  // Owner 2: Linda Chen — Coastal Realty Group (Starter tier, commercial focus)
  const ownerCoastal = await prisma.user.create({
    data: {
      email: "owner.coastal@yopmail.com", name: "Linda Chen", password: passwordHash, role: Role.OWNER,
      phone: "+1 415-555-0200",
      bankName: "Wells Fargo", accountNumber: encrypt("444455556666"), accountName: "Coastal Realty Escrow",
      balance: 9200.00,
      currentTierId: starterTier.id, subscriptionStatus: "Active", accountStatus: "ACTIVE",
      creditScore: 760, hasCompletedOnboarding: true, onboardingStep: 4,
      approvalThreshold: 300.00, emergencyOverrideLimit: 1500.00,
    },
  });

  // Owner 3: Raj Patel — Patel Realty (Hobbyist, single house, mid-onboarding)
  const ownerPatel = await prisma.user.create({
    data: {
      email: "owner.patel@yopmail.com", name: "Raj Patel", password: passwordHash, role: Role.OWNER,
      phone: "+1 408-555-0300",
      currentTierId: hobbyistTier.id, subscriptionStatus: "Active", accountStatus: "ACTIVE",
      creditScore: 720, hasCompletedOnboarding: false, onboardingStep: 2,
    },
  });

  // Owner 4: Alex Morgan — FIRST-TIME LOGIN (no onboarding, no properties)
  await prisma.user.create({
    data: {
      email: "owner.new@yopmail.com", name: "Alex Morgan", password: passwordHash, role: Role.OWNER,
      phone: "+1 213-555-0400",
      currentTierId: starterTier.id, subscriptionStatus: "Active", accountStatus: "ACTIVE",
      hasCompletedOnboarding: false, onboardingStep: 0, // ← sees full onboarding wizard
    },
  });

  // ── Inspectors ──
  const inspectorJake = await prisma.user.create({
    data: { email: "inspector.jake@yopmail.com", name: "Jake Thorpe", password: passwordHash, role: Role.INSPECTOR, phone: "+1 310-555-1001", accountStatus: "ACTIVE", ownerId: ownerAtlas.id },
  });
  await prisma.user.create({
    data: { email: "inspector.sara@yopmail.com", name: "Sara Malone", password: passwordHash, role: Role.INSPECTOR, phone: "+1 310-555-1002", accountStatus: "ACTIVE", ownerId: ownerAtlas.id },
  });
  await prisma.user.create({
    data: { email: "inspector.david@yopmail.com", name: "David Kim", password: passwordHash, role: Role.INSPECTOR, phone: "+1 415-555-2001", accountStatus: "ACTIVE", ownerId: ownerCoastal.id },
  });
  await prisma.user.create({
    data: { email: "inspector.priya@yopmail.com", name: "Priya Nair", password: passwordHash, role: Role.INSPECTOR, phone: "+1 415-555-2002", accountStatus: "ACTIVE", ownerId: ownerCoastal.id },
  });

  // ── Tenants ──
  const tenantAdam = await prisma.user.create({
    data: { email: "tenant.adam@yopmail.com", name: "Adam Brooks", password: passwordHash, role: Role.TENANT, phone: "+1 310-555-3001", tenantStatus: "Active", creditScore: 780, annualIncome: 115000, ssn: encrypt("123-45-6789"), employer: "TechCorp Inc.", position: "Senior Engineer", employmentStatus: "EMPLOYED", emergencyName: "Lisa Brooks", emergencyRelationship: "Spouse", emergencyPhone: "+1 310-555-3002" },
  });
  const tenantNora = await prisma.user.create({
    data: { email: "tenant.nora@yopmail.com", name: "Nora Klein", password: passwordHash, role: Role.TENANT, phone: "+1 310-555-3003", tenantStatus: "Pending Onboarding", creditScore: 710, annualIncome: 72000, ssn: encrypt("234-56-7890"), employer: "Design Studio LA", position: "Graphic Designer", employmentStatus: "EMPLOYED" },
  });
  const tenantOscar = await prisma.user.create({
    data: { email: "tenant.oscar@yopmail.com", name: "Oscar Diaz", password: passwordHash, role: Role.TENANT, phone: "+1 310-555-3004", tenantStatus: "Active", creditScore: 620, annualIncome: 52000, ssn: encrypt("345-67-8901"), employer: "Warehouse Co.", position: "Supervisor" },
  });
  const tenantMarvin = await prisma.user.create({
    data: { email: "tenant.marvin@yopmail.com", name: "Marvin Torres", password: passwordHash, role: Role.TENANT, phone: "+1 310-555-3005", tenantStatus: "Active", creditScore: 740, annualIncome: 88000, ssn: encrypt("456-78-9012"), employer: "Metro Health", position: "Nurse Practitioner", employmentStatus: "EMPLOYED" },
  });
  const tenantLiam = await prisma.user.create({
    data: { email: "tenant.liam@yopmail.com", name: "Liam Walsh", password: passwordHash, role: Role.TENANT, phone: "+1 310-555-3006", tenantStatus: "Active", creditScore: 690, annualIncome: 65000, ssn: encrypt("567-89-0123") },
  });
  const tenantAmy = await prisma.user.create({
    data: { email: "tenant.amy@yopmail.com", name: "Amy Foster", password: passwordHash, role: Role.TENANT, phone: "+1 310-555-3007", tenantStatus: "Active", creditScore: 730, annualIncome: 78000, ssn: encrypt("678-90-1234") },
  });
  const tenantDan = await prisma.user.create({
    data: { email: "tenant.dan@yopmail.com", name: "Dan Gibbs", password: passwordHash, role: Role.TENANT, phone: "+1 310-555-3008", tenantStatus: "Active", creditScore: 680, annualIncome: 60000, ssn: encrypt("789-01-2345") },
  });
  const tenantEve = await prisma.user.create({
    data: { email: "tenant.eve@yopmail.com", name: "Eve Morales", password: passwordHash, role: Role.TENANT, phone: "+1 310-555-3009", tenantStatus: "Inactive", creditScore: 760, annualIncome: 90000, ssn: encrypt("890-12-3456") },
  });
  const tenantKelly = await prisma.user.create({
    data: { email: "tenant.kelly@yopmail.com", name: "Kelly Huang", password: passwordHash, role: Role.TENANT, phone: "+1 310-555-3010", tenantStatus: "Active", creditScore: 715, annualIncome: 70000, ssn: encrypt("901-23-4567") },
  });
  const tenantScott = await prisma.user.create({
    data: { email: "tenant.scott@yopmail.com", name: "Scott Park", password: passwordHash, role: Role.TENANT, phone: "+1 310-555-3011", tenantStatus: "Active", creditScore: 750, annualIncome: 82000, ssn: encrypt("012-34-5678") },
  });
  const tenantCarlos = await prisma.user.create({
    data: { email: "tenant.carlos@yopmail.com", name: "Carlos Ruiz", password: passwordHash, role: Role.TENANT, phone: "+1 415-555-4001", tenantStatus: "Active", creditScore: 800, annualIncome: 250000, ssn: encrypt("111-22-3333"), employer: "Ruiz Enterprises LLC", position: "CEO", employmentStatus: "EMPLOYED" },
  });
  // FIRST-TIME TENANT — no lease, empty dashboard
  await prisma.user.create({
    data: { email: "tenant.new@yopmail.com", name: "Sam Taylor", password: passwordHash, role: Role.TENANT, phone: "+1 213-555-5001", tenantStatus: "Pending Onboarding", creditScore: 700, annualIncome: 58000 },
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

  // ── SECTION 4: Properties & Units ──────────────────────────────────────────
  console.log("🏠 Creating properties and units...");

  // ── Property 1: Grand Horizon Towers (Apartment, Atlas) ──
  const propGrand = await prisma.property.create({
    data: {
      name: "Grand Horizon Towers", address: "100 Grand Avenue", city: "Los Angeles", state: "CA", zip: "90015", country: "USA",
      type: "Apartment", ownerId: ownerAtlas.id, approvalStatus: "APPROVED",
      yearBuilt: 2018, description: "Modern luxury apartment complex in downtown LA with premium amenities.", parkingSpaces: 120,
      amenities: ["Pool", "Gym", "Rooftop Deck", "Concierge", "EV Charging"],
      coverPhoto: IMG.apartment.cover, images: [IMG.apartment.cover, IMG.apartment.unit2br, IMG.apartment.unit3br],
      units: { create: [
        { name: "101", type: "Apartment", floor: 1, rentAmount: 2000, depositAmt: 2500, rooms: 1, bathrooms: 1, sqFootage: 800, status: "OCCUPIED", maxOccupants: 2, amenities: ["Balcony", "In-unit W/D"], images: [IMG.apartment.unit1br] },
        { name: "102", type: "Apartment", floor: 1, rentAmount: 3000, depositAmt: 3500, rooms: 2, bathrooms: 2, sqFootage: 1200, status: "OCCUPIED", maxOccupants: 3, amenities: ["City Views", "Stainless Appliances"], images: [IMG.apartment.unit2br] },
        { name: "103", type: "Apartment", floor: 2, rentAmount: 2400, depositAmt: 2800, rooms: 1, bathrooms: 1, sqFootage: 900, status: "OCCUPIED", maxOccupants: 2, images: [IMG.apartment.interior1] },
        { name: "104", type: "Apartment", floor: 2, rentAmount: 3200, depositAmt: 3800, rooms: 2, bathrooms: 2, sqFootage: 1300, status: "OCCUPIED", maxOccupants: 4, amenities: ["Corner Unit"], images: [IMG.apartment.interior2] },
        { name: "105", type: "Apartment", floor: 3, rentAmount: 2800, depositAmt: 3000, rooms: 2, bathrooms: 1, sqFootage: 1100, status: "VACANT", maxOccupants: 2, images: [IMG.apartment.interior3] },
        { name: "106", type: "Apartment", floor: 3, rentAmount: 4500, depositAmt: 5000, rooms: 3, bathrooms: 2, sqFootage: 1800, status: "VACANT", maxOccupants: 5, amenities: ["Penthouse Views", "Premium Finishes"], images: [IMG.apartment.unit3br] },
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
      coverPhoto: IMG.house.cover, images: [IMG.house.cover, IMG.house.interior, IMG.house.exterior],
      units: { create: [
        { name: "Main Villa", type: "House", rentAmount: 7500, depositAmt: 7500, rooms: 4, bathrooms: 3, sqFootage: 3200, status: "VACANT", maxOccupants: 6, amenities: ["Pool", "Ocean View", "3-Car Garage"], images: [IMG.house.interior] },
      ]},
    },
    include: { units: true },
  });

  // ── Property 3: Move-Out Sandbox Estates (Apartment, Atlas) ──
  const propMoveout = await prisma.property.create({
    data: {
      name: "Move-Out Sandbox Estates", address: "999 Testing Lane", city: "Los Angeles", state: "CA", zip: "90001", country: "USA",
      type: "Apartment", ownerId: ownerAtlas.id, approvalStatus: "APPROVED",
      coverPhoto: IMG.apartment.cover, images: [IMG.apartment.cover],
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

  // ── Property 5: Patel Family Home (House, Patel) — PENDING admin approval ──
  const propPatel = await prisma.property.create({
    data: {
      name: "Patel Family Home", address: "2847 Oak Creek Drive", city: "San Jose", state: "CA", zip: "95128", country: "USA",
      type: "House", ownerId: ownerPatel.id, approvalStatus: "PENDING", // ← tests admin approval queue
      yearBuilt: 2002, description: "Charming single-family home in a quiet residential neighborhood.", parkingSpaces: 2,
      amenities: ["Backyard", "Garage", "Hardwood Floors"],
      coverPhoto: IMG.house.exterior, images: [IMG.house.exterior, IMG.house.interior],
      units: { create: [
        { name: "Main Home", type: "House", rentAmount: 4200, depositAmt: 4200, rooms: 3, bathrooms: 2, sqFootage: 1850, status: "VACANT", maxOccupants: 5 },
      ]},
    },
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

  // 1. SUBMITTED — Needs assignment
  await prisma.maintenanceRequest.create({
    data: {
      unitId: u104.id, tenantId: tenantMarvin.id,
      title: "Smoke Detector Low Battery Alarm",
      description: "The smoke detector in the hallway has been beeping every 30 seconds for 2 days. Low battery.",
      category: "GENERAL", priority: "LOW", status: "SUBMITTED", entryPermission: true, hasPets: "No",
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
    },
  });

  // 3. ASSIGNED — Inspector Jake assigned, tenant confirmed schedule
  const ticketHvac = await prisma.maintenanceRequest.create({
    data: {
      unitId: u104.id, tenantId: tenantMarvin.id,
      title: "HVAC System Not Cooling",
      description: "Central AC stopped blowing cold air. Ambient temp is 88°F. We have a toddler at home — urgent.",
      category: "APPLIANCE", priority: "HIGH", status: "ASSIGNED",
      inspectorId: inspectorJake.id, scheduledDate: dDaysAfter(2),
      entryPermission: true, hasPets: "Yes", tenantConfirmedSchedule: true,
    },
  });

  // 4. DIAGNOSIS_SCHEDULED — Diagnosis date set by inspector
  await prisma.maintenanceRequest.create({
    data: {
      unitId: u104.id, tenantId: tenantMarvin.id,
      title: "Dishwasher Leaking from Front Panel",
      description: "A pool of water forms under the front panel after each dishwasher cycle.",
      category: "APPLIANCE", priority: "MEDIUM", status: "ASSIGNED",
      inspectorId: inspectorJake.id, diagnosisDate: dDaysAfter(1), entryPermission: true, hasPets: "No",
    },
  });

  // 5. AWAITING_APPROVAL — Estimate above owner approval threshold ($500)
  await prisma.maintenanceRequest.create({
    data: {
      unitId: u104.id, tenantId: tenantMarvin.id,
      title: "Water Heater Full Replacement Required",
      description: "Water heater has severe corrosion and is leaking from the base. Complete unit failure imminent.",
      category: "PLUMBING", priority: "HIGH", status: "AWAITING_APPROVAL",
      inspectorId: inspectorJake.id,
      estimatedLabor: 750.00, estimatedMaterials: 650.00,
      inspectorNotes: "Tank is ~15 years old with severe base corrosion. Total replacement required. Estimated $1,400 — needs owner approval above the $500 threshold.",
      diagnosisDate: dDaysBefore(2),
    },
  });

  // 6. PENDING_TENANT_CONFIRMATION — Vendor fault, chargeback ruling undecided
  await prisma.maintenanceRequest.create({
    data: {
      unitId: u104.id, tenantId: tenantMarvin.id,
      title: "Shattered Sliding Patio Door Glass",
      description: "The entire glass pane of the sliding patio door is shattered. Tenant denies causing it.",
      category: "GENERAL", priority: "HIGH", status: "PENDING_TENANT_CONFIRMATION",
      finalLabor: 280.00, finalMaterials: 420.00,
      vendorReportedFault: true, ownerChargebackDecision: null, // Owner has not ruled yet
      inspectorNotes: "Glass shows external impact point pattern. Tenant claims it was pre-existing.",
    },
  });

  // 7. CLOSED — Normal wear & tear
  await prisma.maintenanceRequest.create({
    data: {
      unitId: u104.id, tenantId: tenantMarvin.id,
      title: "Stiff Front Door Deadbolt",
      description: "The front door deadbolt is increasingly difficult to operate.",
      category: "GENERAL", priority: "LOW", status: "CLOSED",
      finalLabor: 60.00, finalMaterials: 20.00,
      vendorReportedFault: false, ownerChargebackDecision: "WEAR_AND_TEAR",
      inspectorNotes: "Deadbolt mechanism worn from age and repeated use. Replaced with new set.",
      tenantRating: 5, tenantFeedback: "Super fast response! Issue resolved perfectly.",
    },
  });

  // 8. CLOSED — Tenant fault, deposit deduction applied
  const ticketTile = await prisma.maintenanceRequest.create({
    data: {
      unitId: u104.id, tenantId: tenantMarvin.id,
      title: "Cracked Bathroom Tile (Tenant Fault)",
      description: "Large crack running across bathroom floor tile near the shower door.",
      category: "GENERAL", priority: "MEDIUM", status: "CLOSED",
      finalLabor: 80.00, finalMaterials: 45.00,
      vendorReportedFault: true, ownerChargebackDecision: "TENANT_FAULT",
      chargebackSource: "DEPOSIT", chargebackDepositAmount: 125.00, chargebackInvoiceAmount: 0.00,
      inspectorNotes: "Impact crack pattern consistent with dropped heavy object. Deposit deduction recommended.",
    },
  });
  await prisma.transaction.create({
    data: { type: "EXPENSE", category: "DEPOSIT", amount: 125.00, reference: `DEPOSIT_DEDUCT_${ticketTile.id.slice(-6).toUpperCase()}`, status: "COMPLETED", tenantId: tenantMarvin.id },
  });

  // 9. EMERGENCY — External vendor dispatched (tests vendor magic link)
  await prisma.maintenanceRequest.create({
    data: {
      unitId: u104.id, tenantId: tenantMarvin.id,
      title: "🚨 EMERGENCY: Burst Pipe Under Bathroom Sink",
      description: "A pipe under the bathroom sink has burst. Water spraying out. I shut the under-sink valve but may still be water in walls.",
      category: "PLUMBING", priority: "EMERGENCY", status: "ASSIGNED",
      inspectorId: inspectorJake.id, externalVendorId: vendorPlumbing.id,
      vendorMagicToken: "DEMO-VENDOR-BURST-PIPE-2025-TOKEN",
      vendorTokenExpiresAt: dDaysAfter(14),
      entryPermission: true, hasPets: "No",
    },
  });

  // 10. SUBMITTED — Commercial property ticket (Coastal)
  await prisma.maintenanceRequest.create({
    data: {
      unitId: suiteA.id, tenantId: tenantCarlos.id,
      title: "Suite A HVAC Temperature Imbalance",
      description: "HVAC creating inconsistent temperatures across the office floor. East zone is 10°F warmer than west zone. Impacting employee productivity.",
      category: "APPLIANCE", priority: "MEDIUM", status: "SUBMITTED", entryPermission: true,
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
  console.log("🏡 Creating tours and applications...");

  await prisma.tour.create({ data: { propertyId: propGrand.id, unitId: u106.id, tenantName: "Emily Zhao", tenantEmail: "emily.tour@yopmail.com", tenantPhone: "+1 310-555-9001", tourType: TourType.IN_PERSON, scheduledAt: dDaysAfter(5), status: TourStatus.PENDING } });
  await prisma.tour.create({ data: { propertyId: propGrand.id, unitId: u106.id, tenantName: "Marcus Webb", tenantEmail: "marcus.tour@yopmail.com", tenantPhone: "+1 310-555-9002", tourType: TourType.VIDEO_CALL, scheduledAt: dDaysAfter(3), status: TourStatus.CONFIRMED } });
  await prisma.tour.create({ data: { propertyId: propVilla.id, unitId: propVilla.units[0].id, tenantName: "Patricia Lowe", tenantEmail: "patricia.tour@yopmail.com", tenantPhone: "+1 310-555-9003", tourType: TourType.IN_PERSON, scheduledAt: dDaysBefore(5), status: TourStatus.COMPLETED, feedbackRating: 5, feedbackComments: "Absolutely stunning property! Very interested in moving forward." } });
  await prisma.tour.create({ data: { propertyId: propCommercial.id, unitId: suiteB.id, tenantName: "Vertex Analytics Contact", tenantEmail: "vertex.tour@yopmail.com", tenantPhone: "+1 415-555-9004", tourType: TourType.IN_PERSON, scheduledAt: dDaysAfter(8), status: TourStatus.PENDING } });

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
  await prisma.message.create({ data: { senderId: tenantAdam.id, receiverId: ownerAtlas.id, content: "Hi Marcus, just wanted to confirm my rent payment went through for this month.", conversationId: convAdamAtlas } });
  await prisma.message.create({ data: { senderId: ownerAtlas.id, receiverId: tenantAdam.id, content: "Yes Adam, received it! Thank you for always being on time. Invoice is marked as paid in your dashboard.", isRead: true, conversationId: convAdamAtlas } });
  await prisma.message.create({ data: { senderId: tenantAdam.id, receiverId: ownerAtlas.id, content: "Great! Also, is it possible to get a copy of my original lease document?", conversationId: convAdamAtlas } });
  await prisma.message.create({ data: { senderId: ownerAtlas.id, receiverId: tenantAdam.id, content: "Of course! I've uploaded it to your Documents tab. You should be able to download it from there.", conversationId: convAdamAtlas } });

  // Thread 2: Marvin ↔ Jake (HVAC scheduling)
  const convMarvinJake = [tenantMarvin.id, inspectorJake.id].sort().join("_");
  await prisma.message.create({ data: { senderId: tenantMarvin.id, receiverId: inspectorJake.id, content: "Hi Jake, is the HVAC inspection still confirmed for Thursday at 10 AM?", conversationId: convMarvinJake, ticketId: ticketHvac.id } });
  await prisma.message.create({ data: { senderId: inspectorJake.id, receiverId: tenantMarvin.id, content: "Yes, confirmed! Please ensure the entry keypad code works. I'll need full unit access.", isRead: true, conversationId: convMarvinJake, ticketId: ticketHvac.id } });
  await prisma.message.create({ data: { senderId: tenantMarvin.id, receiverId: inspectorJake.id, content: "Gate code is 4821#. I'll be home if you have any questions. Thank you!", conversationId: convMarvinJake, ticketId: ticketHvac.id } });

  // Thread 3: Atlas Owner ↔ Jake (estimate approval)
  const convAtlasJake = [ownerAtlas.id, inspectorJake.id].sort().join("_");
  await prisma.message.create({ data: { senderId: inspectorJake.id, receiverId: ownerAtlas.id, content: "Marcus, submitted the estimate for Unit 104 water heater replacement. Total cost $1,400 — above your $500 threshold, needs approval.", conversationId: convAtlasJake } });
  await prisma.message.create({ data: { senderId: ownerAtlas.id, receiverId: inspectorJake.id, content: "Approved, Jake! Schedule the replacement ASAP — they have a toddler and it's been days without hot water.", isRead: true, conversationId: convAtlasJake } });

  // Thread 4: Dan ↔ Atlas Owner (deposit dispute)
  const convDanAtlas = [tenantDan.id, ownerAtlas.id].sort().join("_");
  await prisma.message.create({ data: { senderId: tenantDan.id, receiverId: ownerAtlas.id, content: "Hi Marcus, I'm disputing the window blind deduction. I have timestamped photos from move-in day showing it was already broken.", conversationId: convDanAtlas } });
  await prisma.message.create({ data: { senderId: ownerAtlas.id, receiverId: tenantDan.id, content: "Thank you for providing context, Dan. I'll review the original move-in inspection photos and get back to you within 3 business days.", conversationId: convDanAtlas } });
  await prisma.message.create({ data: { senderId: tenantDan.id, receiverId: ownerAtlas.id, content: "I've attached all relevant photos to the dispute form in my dashboard. Please review at your earliest convenience.", conversationId: convDanAtlas } });

  // Thread 5: Carlos ↔ Coastal Owner (commercial HVAC query)
  const convCarlosCoastal = [tenantCarlos.id, ownerCoastal.id].sort().join("_");
  await prisma.message.create({ data: { senderId: tenantCarlos.id, receiverId: ownerCoastal.id, content: "Linda, we submitted a maintenance request for Suite A HVAC — it's creating a 10°F temperature differential across the office. Affecting our team.", conversationId: convCarlosCoastal } });
  await prisma.message.create({ data: { senderId: ownerCoastal.id, receiverId: tenantCarlos.id, content: "Hi Carlos, I've assigned our inspector David Kim to assess this. He'll contact you to schedule a site visit early next week.", conversationId: convCarlosCoastal } });

  // ── SECTION 13: Notifications ──────────────────────────────────────────────
  console.log("🔔 Creating notifications...");
  await prisma.notification.createMany({
    data: [
      // Owner Atlas
      { userId: ownerAtlas.id, title: "New Maintenance Estimate Pending", message: "Jake Thorpe submitted a $1,400 estimate for Unit 104 water heater replacement. Review & approve.", type: "MAINTENANCE", priority: "HIGH" },
      { userId: ownerAtlas.id, title: "Move-Out Request Received", message: "Liam Walsh (Unit 201) has submitted a move-out request. Inspection needs to be scheduled.", type: "SYSTEM", priority: "HIGH" },
      { userId: ownerAtlas.id, title: "Payout Request Under Review", message: "Your $12,500 disbursement request is pending admin review. Estimated 1-2 business days.", type: "BILLING", priority: "MEDIUM" },
      { userId: ownerAtlas.id, title: "Tenant Dispute Raised", message: "Dan Gibbs (Unit 203) has disputed deposit deductions of $375. Resolution required.", type: "SYSTEM", priority: "HIGH" },
      { userId: ownerAtlas.id, title: "Renewal Window Open", message: "Adam Brooks' lease (Unit 102) expires in 6 months. Renewal decision needed.", type: "SYSTEM", priority: "MEDIUM" },
      // Owner Coastal
      { userId: ownerCoastal.id, title: "Commercial Maintenance Request", message: "Carlos Ruiz (Suite A) submitted an HVAC maintenance request. Assign an inspector.", type: "MAINTENANCE", priority: "MEDIUM" },
      { userId: ownerCoastal.id, title: "New Commercial Application", message: "Vertex Analytics Inc. applied for Suite B — 36-month NNN lease, $6,500/month.", type: "SYSTEM", priority: "HIGH" },
      // Admin
      { userId: admin.id, title: "Payout Request — Atlas Properties", message: "Marcus Reed (Atlas Properties LLC) requested a $12,500 disbursement. Admin action required.", type: "BILLING", priority: "HIGH" },
      { userId: admin.id, title: "Property Pending Approval", message: "Raj Patel submitted 'Patel Family Home' for platform listing approval. Review required.", type: "SYSTEM", priority: "HIGH" },
      { userId: admin.id, title: "New Owner Application", message: "Greenfield Holdings LLC submitted an owner application. Review in the admin panel.", type: "SYSTEM", priority: "MEDIUM" },
      // Tenant Adam
      { userId: tenantAdam.id, title: "Rent Receipt Confirmed", message: "Your rent payment of $3,000 has been received and recorded. Receipt available in your dashboard.", type: "BILLING", isRead: true, priority: "LOW" },
      { userId: tenantAdam.id, title: "Lease Renewal Offer", message: "Your lease expires in 6 months. Your owner Marcus Reed has sent a renewal offer for review.", type: "SYSTEM", priority: "MEDIUM" },
      // Tenant Oscar
      { userId: tenantOscar.id, title: "⚠️ Rent Overdue Notice", message: "Your rent of $2,400 is now overdue. A late fee of $120 has been applied. Please pay immediately.", type: "BILLING", priority: "HIGH" },
      // Tenant Marvin
      { userId: tenantMarvin.id, title: "Inspection Scheduled", message: "Jake Thorpe will inspect your HVAC on Thursday at 10 AM. Ensure entry access is available.", type: "MAINTENANCE", priority: "MEDIUM" },
      // Tenant Nora
      { userId: tenantNora.id, title: "Action Required: Sign Your Lease", message: "Your lease for Unit 101 is ready for signature and deposit payment. Complete now to confirm your move-in.", type: "SYSTEM", priority: "HIGH" },
      // Tenant Liam
      { userId: tenantLiam.id, title: "Move-Out Inspection Scheduled", message: "Your move-out inspection is scheduled for next Thursday at 2 PM. Inspector: Jake Thorpe.", type: "SYSTEM", priority: "MEDIUM" },
      // Tenant Dan
      { userId: tenantDan.id, title: "Dispute Under Review", message: "Your deposit dispute has been submitted. The owner will respond within 3 business days.", type: "SYSTEM", priority: "MEDIUM" },
      // Tenant Kelly
      { userId: tenantKelly.id, title: "Keys Confirmed — Deposit Decision Pending", message: "Your key return has been confirmed. Your deposit of $2,500 will be processed within 21 days.", type: "SYSTEM", priority: "MEDIUM" },
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

  // ── DONE ──────────────────────────────────────────────────────────────────
  console.log("\\n====================================================");
  console.log(" ✅ PropertyPro Production Demo Seed COMPLETE!");
  console.log("====================================================");
  console.log("");
  console.log("🔑 LOGIN MATRIX  (Universal password: Demo@1234)");
  console.log("─────────────────────────────────────────────────────");
  console.log(" ROLE              | EMAIL");
  console.log("─────────────────────────────────────────────────────");
  console.log(" Super Admin       | admin@yopmail.com");
  console.log(" Owner (Full)      | owner.atlas@yopmail.com");
  console.log(" Owner (Commercial)| owner.coastal@yopmail.com");
  console.log(" Owner (Hobbyist)  | owner.patel@yopmail.com");
  console.log(" Owner (New)  ★    | owner.new@yopmail.com     ← First-time onboarding wizard");
  console.log(" Inspector         | inspector.jake@yopmail.com");
  console.log(" Inspector         | inspector.sara@yopmail.com");
  console.log(" Tenant (Perfect)  | tenant.adam@yopmail.com   ← All paid, renewals");
  console.log(" Tenant (Overdue)  | tenant.oscar@yopmail.com  ← Overdue rent + late fee");
  console.log(" Tenant (Maint.)   | tenant.marvin@yopmail.com ← Active maintenance tickets");
  console.log(" Tenant (Sign)     | tenant.nora@yopmail.com   ← Pending signature + deposit");
  console.log(" Tenant (Move-Out) | tenant.liam@yopmail.com   ← Inspection scheduled");
  console.log(" Tenant (Dispute)  | tenant.dan@yopmail.com    ← Deposit dispute");
  console.log(" Tenant (Comm.)    | tenant.carlos@yopmail.com ← Commercial NNN lease");
  console.log(" Tenant (New)  ★   | tenant.new@yopmail.com    ← First-time empty dashboard");
  console.log("─────────────────────────────────────────────────────");
  console.log("");
  console.log("📧  Email testing: https://yopmail.com");
  console.log("🔗  Vendor portal: /vendor/ticket/DEMO-VENDOR-BURST-PIPE-2025-TOKEN");
  console.log("🎫  Invite token:  /invite/DEMO-INVITE-IRIS-PHAM-2025");
  console.log("====================================================\\n");
}

main()
  .catch((e) => { console.error("\\n❌ Seeding failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
