import "dotenv/config";
import { PrismaClient, Role, PayoutStatus, TourType, TourStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

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
  return `${iv.toString("hex")}:${authTag.toString()}:${encrypted}`;
}

async function main() {
  console.log("Wiping existing database for clean sandbox installation...");
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

  console.log("Creating settings, tiers, and users...");
  const passwordHash = await bcrypt.hash("Test@1234", 10);

  await prisma.platformSettings.create({ data: { adminFeePercent: 2.00 } });

  const tiers = await Promise.all([
    prisma.pricingTier.create({ data: { name: "Hobbyist", description: "Landlords starting out", price: 0, minUnits: 1, maxUnits: 2, features: ["Up to 2 Units"] } }),
    prisma.pricingTier.create({ data: { name: "Starter", description: "Independent landlords", price: 29, minUnits: 3, maxUnits: 15, features: ["Up to 15 Units", "Ticketing"] } }),
    prisma.pricingTier.create({ data: { name: "Professional", description: "Growing portfolio", price: 79, minUnits: 16, maxUnits: 50, features: ["Up to 50 Units", "Priority Support"] } }),
    prisma.pricingTier.create({ data: { name: "Enterprise", description: "Large companies", price: 149, minUnits: 51, maxUnits: 9999, features: ["Unlimited Units", "Custom API"], isCustom: true } })
  ]);
  const proTierId = tiers[2].id;
  const starterTierId = tiers[1].id;

  // 1. Core Users (Super Admin, Busy Owner, Starter Owner, Onboarding Owner)
  const admin = await prisma.user.create({
    data: { email: "admin@propertypro.test", name: "System Admin", password: passwordHash, role: Role.SUPERADMIN }
  });

  const ownerFull = await prisma.user.create({
    data: {
      email: "owner_full@propertypro.test", name: "Atlas Properties LLC", password: passwordHash, role: Role.OWNER,
      bankName: "Chase Bank", accountNumber: encrypt("111122223333"), accountName: "Atlas Escrow", balance: 20500.50,
      currentTierId: proTierId, subscriptionStatus: "Active", accountStatus: "ACTIVE",
      creditScore: 780, hasCompletedOnboarding: true, onboardingStep: 4
    }
  });

  const owner2 = await prisma.user.create({
    data: {
      email: "owner2@propertypro.test", name: "Coastal Realty Group", password: passwordHash, role: Role.OWNER,
      bankName: "Wells Fargo", accountNumber: encrypt("444455556666"), accountName: "Coastal Escrow", balance: 3450.00,
      currentTierId: starterTierId, subscriptionStatus: "Active", accountStatus: "ACTIVE",
      creditScore: 710, hasCompletedOnboarding: true, onboardingStep: 4
    }
  });

  const ownerNew = await prisma.user.create({
    data: {
      email: "owner_new@propertypro.test", name: "Fresh Start Realty", password: passwordHash, role: Role.OWNER,
      currentTierId: starterTierId, subscriptionStatus: "Active", accountStatus: "ACTIVE",
      creditScore: 680, hasCompletedOnboarding: false, onboardingStep: 0
    }
  });

  // 2. Inspectors (Busy & New)
  const inspectorBusy = await prisma.user.create({
    data: { email: "inspector_busy@propertypro.test", name: "Jake The Inspector", password: passwordHash, role: Role.INSPECTOR, phone: "+1 555-111-2222" }
  });

  const inspectorNew = await prisma.user.create({
    data: { email: "inspector_new@propertypro.test", name: "Sara Field Inspector", password: passwordHash, role: Role.INSPECTOR, phone: "+1 555-111-3333" }
  });

  // 3. Tenants (Isolated Sandboxes)
  const tenantNew = await prisma.user.create({
    data: { email: "tenant_new@propertypro.test", name: "New Nora", password: passwordHash, role: Role.TENANT, tenantStatus: "Pending Onboarding", creditScore: 690, annualIncome: 55000, ssn: encrypt("000-11-2222") }
  });

  const tenantPerfect = await prisma.user.create({
    data: { email: "tenant_perfect@propertypro.test", name: "Active Adam", password: passwordHash, role: Role.TENANT, tenantStatus: "Active", creditScore: 750, annualIncome: 110000, ssn: encrypt("000-34-5678") }
  });

  const tenantOverdue = await prisma.user.create({
    data: { email: "tenant_overdue@propertypro.test", name: "Overdue Oscar", password: passwordHash, role: Role.TENANT, tenantStatus: "Active", creditScore: 610, annualIncome: 48000, ssn: encrypt("000-56-7890") }
  });

  const tenantMaintenance = await prisma.user.create({
    data: { email: "tenant_maintenance@propertypro.test", name: "Maintenance Marvin", password: passwordHash, role: Role.TENANT, tenantStatus: "Active", creditScore: 720, annualIncome: 85000, ssn: encrypt("000-44-5555") }
  });

  const tenantMoveOut = await prisma.user.create({
    data: { email: "tenant_moveout@propertypro.test", name: "Leaving Liam", password: passwordHash, role: Role.TENANT, tenantStatus: "Active", creditScore: 640, annualIncome: 55000, ssn: encrypt("000-78-9012") }
  });

  const tenantExpired = await prisma.user.create({
    data: { email: "tenant_expired@propertypro.test", name: "Eve Expired", password: passwordHash, role: Role.TENANT, tenantStatus: "Inactive", creditScore: 790, annualIncome: 95000, ssn: encrypt("000-90-1234") }
  });

  // 4. Vendors
  const vendorPlumber = await prisma.externalVendor.create({
    data: { name: "FastFix Plumbing Co.", email: "plumber@vendor.com", phone: "+1 555-300-1111", specialty: "Plumbing", w9OnFile: true, insuranceOnFile: true, baseCallOutFee: 75.0, ownerId: ownerFull.id, bankName: "Bank of America", routingNumber: encrypt("026009593"), accountNumber: encrypt("987654321") }
  });

  const vendorSpark = await prisma.externalVendor.create({
    data: { name: "Bright Spark Electric", email: "electric@vendor.com", phone: "+1 555-300-2222", specialty: "Electrical", w9OnFile: true, insuranceOnFile: false, baseCallOutFee: 95.0, ownerId: ownerFull.id }
  });

  // 5. Properties & Units
  console.log("Creating Properties and Units...");
  const propA = await prisma.property.create({
    data: {
      name: "Grand Horizon Towers", address: "100 Grand Ave", city: "Los Angeles", state: "CA", zip: "90015", country: "USA",
      ownerId: ownerFull.id, approvalStatus: "APPROVED", type: "Apartment",
      coverPhoto: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200",
      images: ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200"],
      units: { create: [
        { name: "101", type: "Apartment", rentAmount: 2000, depositAmt: 2500, rooms: 1, sqFootage: 800, status: "VACANT", images: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200"] },
        { name: "102", type: "Apartment", rentAmount: 3000, depositAmt: 3500, rooms: 2, sqFootage: 1200, status: "OCCUPIED", images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200"] },
        { name: "103", type: "Apartment", rentAmount: 4500, depositAmt: 5000, rooms: 3, sqFootage: 1800, status: "OCCUPIED", images: ["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200"] },
        { name: "104", type: "Apartment", rentAmount: 3200, depositAmt: 3500, rooms: 2, sqFootage: 1300, status: "OCCUPIED", images: ["https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200"] },
        { name: "105", type: "Apartment", rentAmount: 2800, depositAmt: 3000, rooms: 2, sqFootage: 1100, status: "OCCUPIED", images: ["https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=1200"] },
        { name: "106", type: "Apartment", rentAmount: 2200, depositAmt: 2200, rooms: 1, sqFootage: 900, status: "OCCUPIED", images: ["https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200"] }
      ]}
    },
    include: { units: true }
  });
  const u101 = propA.units.find(u => u.name === "101")!;
  const u102 = propA.units.find(u => u.name === "102")!;
  const u103 = propA.units.find(u => u.name === "103")!;
  const u104 = propA.units.find(u => u.name === "104")!;
  const u105 = propA.units.find(u => u.name === "105")!;
  const u106 = propA.units.find(u => u.name === "106")!;

  const propHouse = await prisma.property.create({
    data: {
      name: "Sunset Villa", address: "400 Sunset Blvd", city: "Los Angeles", state: "CA", zip: "90028", country: "USA",
      ownerId: ownerFull.id, approvalStatus: "APPROVED", type: "House",
      coverPhoto: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200",
      images: ["https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200"],
      units: { create: [
        { name: "Main House", type: "House", rentAmount: 5500, depositAmt: 5500, rooms: 4, sqFootage: 2800, status: "VACANT", images: ["https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200"] }
      ]}
    },
    include: { units: true }
  });
  
  // Pending Property for Owner 2 (tests admin approval queue)
  const propPending = await prisma.property.create({
    data: {
      name: "Miami Luxury Villa", address: "500 Ocean Dr", city: "Miami", state: "FL", zip: "33139", country: "USA",
      ownerId: owner2.id, approvalStatus: "PENDING", type: "House",
      coverPhoto: "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1200",
      images: ["https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1200"],
      units: { create: [{ name: "Villa A", type: "House", rentAmount: 12000, depositAmt: 20000, rooms: 6, sqFootage: 5500, status: "VACANT", images: ["https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200"] }] }
    }
  });

  // Helper dates
  const dateBefore = (m: number) => { const d = new Date(); d.setMonth(d.getMonth() - m); return d; };
  const dateAfter = (m: number) => { const d = new Date(); d.setMonth(d.getMonth() + m); return d; };

  // 6. Tours
  await prisma.tour.create({ data: { propertyId: propHouse.id, unitId: propHouse.units[0].id, tenantName: "Applicant Andy", tenantEmail: "applicant@example.com", tenantPhone: "555-999-0000", scheduledAt: dateAfter(1), status: TourStatus.PENDING, tourType: TourType.IN_PERSON } });

  // 7. Leases Lifecycle
  console.log("Creating Leases and Invoices...");

  // Lease A: tenant_new - Onboarding Flow (Signature Pending, Deposit unpaid)
  const leaseNew = await prisma.lease.create({
    data: {
      unitId: u101.id, tenantId: tenantNew.id, status: "PENDING_SIGNATURE",
      startDate: new Date(), endDate: dateAfter(12), monthlyRent: 2000, securityDeposit: 2500,
      depositStatus: "HELD", depositBalance: 0.00
    }
  });
  await prisma.invoice.create({
    data: { leaseId: leaseNew.id, amount: 2500, dueDate: new Date(), status: "UNPAID", invoiceType: "DEPOSIT" }
  });

  // Lease B: tenant_perfect - Active Adam (All paid, on-time rent)
  const leasePerfect = await prisma.lease.create({
    data: {
      unitId: u102.id, tenantId: tenantPerfect.id, status: "ACTIVE",
      startDate: dateBefore(2), endDate: dateAfter(10), monthlyRent: 3000, securityDeposit: 3500,
      depositPaidAt: dateBefore(2), depositPaidAmount: 3500, depositBalance: 3500,
      depositStatus: "HELD", signedAt: dateBefore(2)
    }
  });
  // Active invoices
  const invDeposit = await prisma.invoice.create({ data: { leaseId: leasePerfect.id, amount: 3500, dueDate: dateBefore(2), status: "PAID", paymentMethod: "STRIPE", grossPaid: 3601.50, processingFee: 101.50, adminFee: 70.00, netToOwner: 3430.00, invoiceType: "DEPOSIT" } });
  const invRentPaid = await prisma.invoice.create({ data: { leaseId: leasePerfect.id, amount: 3000, dueDate: dateBefore(1), status: "PAID", paymentMethod: "STRIPE", grossPaid: 3087.00, processingFee: 87.00, adminFee: 60.00, netToOwner: 2940.00, invoiceType: "RENT" } });
  const invRentDue = await prisma.invoice.create({ data: { leaseId: leasePerfect.id, amount: 3000, dueDate: new Date(), status: "UNPAID", invoiceType: "RENT" } });

  const activeDepositTx = await prisma.transaction.create({
    data: { type: "INCOME", category: "DEPOSIT", amount: 3500, status: "COMPLETED", tenantId: tenantPerfect.id, invoiceId: invDeposit.id }
  });
  await prisma.lease.update({ where: { id: leasePerfect.id }, data: { depositTransactionId: activeDepositTx.id } });
  await prisma.transaction.create({ data: { type: "INCOME", category: "RENT", amount: 3000, status: "COMPLETED", tenantId: tenantPerfect.id, invoiceId: invRentPaid.id } });

  // Lease C: tenant_overdue - Overdue rent sandbox
  const leaseOverdue = await prisma.lease.create({
    data: {
      unitId: u104.id, tenantId: tenantOverdue.id, status: "ACTIVE",
      startDate: dateBefore(1), endDate: dateAfter(11), monthlyRent: 3200, securityDeposit: 3500,
      depositPaidAt: dateBefore(1), depositPaidAmount: 3500, depositBalance: 3500, depositStatus: "HELD"
    }
  });
  await prisma.invoice.create({ data: { leaseId: leaseOverdue.id, amount: 3200, dueDate: dateBefore(1), status: "OVERDUE", invoiceType: "RENT" } });

  // Lease D: tenant_maintenance - Marvin Active Maintenance Sandbox
  const leaseMaintenance = await prisma.lease.create({
    data: {
      unitId: u106.id, tenantId: tenantMaintenance.id, status: "ACTIVE",
      startDate: dateBefore(3), endDate: dateAfter(9), monthlyRent: 2200, securityDeposit: 2200,
      depositPaidAt: dateBefore(3), depositPaidAmount: 2200, depositBalance: 2200, depositStatus: "HELD"
    }
  });
  await prisma.invoice.create({ data: { leaseId: leaseMaintenance.id, amount: 2200, dueDate: dateBefore(2), status: "PAID", invoiceType: "RENT" } });
  await prisma.invoice.create({ data: { leaseId: leaseMaintenance.id, amount: 2200, dueDate: dateBefore(1), status: "PAID", invoiceType: "RENT" } });

  // Lease E: tenant_moveout - Terminated/Move-Out requested
  const leaseMoveOut = await prisma.lease.create({
    data: {
      unitId: u103.id, tenantId: tenantMoveOut.id, status: "ACTIVE",
      startDate: dateBefore(6), endDate: dateAfter(6), monthlyRent: 4500, securityDeposit: 5000,
      depositPaidAt: dateBefore(6), depositPaidAmount: 5000, depositBalance: 5000, depositStatus: "HELD",
      moveOutStatus: "MOVE_OUT_REQUESTED", moveOutRequestDate: new Date(), moveOutDate: dateAfter(0), moveOutReason: "Job transfer"
    }
  });

  // Create additional tenants for deep move-out testing
  const tenantMoveOutScheduled = await prisma.user.create({ data: { email: "tenant_mo_scheduled@propertypro.test", name: "Scheduled Sam", password: passwordHash, role: Role.TENANT, tenantStatus: "Active", creditScore: 700, annualIncome: 60000, ssn: encrypt("111-22-3333") } });
  const tenantMoveOutCompleted = await prisma.user.create({ data: { email: "tenant_mo_inspected@propertypro.test", name: "Inspected Ian", password: passwordHash, role: Role.TENANT, tenantStatus: "Active", creditScore: 710, annualIncome: 62000, ssn: encrypt("222-33-4444") } });
  const tenantMoveOutAccepted = await prisma.user.create({ data: { email: "tenant_mo_accepted@propertypro.test", name: "Accepted Amy", password: passwordHash, role: Role.TENANT, tenantStatus: "Active", creditScore: 720, annualIncome: 65000, ssn: encrypt("333-44-5555") } });
  const tenantMoveOutDisputed = await prisma.user.create({ data: { email: "tenant_mo_disputed@propertypro.test", name: "Disputed Dan", password: passwordHash, role: Role.TENANT, tenantStatus: "Active", creditScore: 730, annualIncome: 68000, ssn: encrypt("444-55-6666") } });
  const tenantMoveOutPending = await prisma.user.create({ data: { email: "tenant_mo_pending@propertypro.test", name: "Pending Penny", password: passwordHash, role: Role.TENANT, tenantStatus: "Active", creditScore: 700, annualIncome: 60000, ssn: encrypt("555-66-7777") } });
  const tenantMoveOutKeys = await prisma.user.create({ data: { email: "tenant_mo_keys@propertypro.test", name: "Keys Kelly", password: passwordHash, role: Role.TENANT, tenantStatus: "Active", creditScore: 700, annualIncome: 60000, ssn: encrypt("666-77-8888") } });
  const tenantMoveOutSkipped = await prisma.user.create({ data: { email: "tenant_mo_skipped@propertypro.test", name: "Skipped Scott", password: passwordHash, role: Role.TENANT, tenantStatus: "Active", creditScore: 710, annualIncome: 62000, ssn: encrypt("777-88-9999") } });

  // Additional units for these leases
  const propB = await prisma.property.create({
    data: {
      name: "Move-Out Sandbox Estates", address: "999 Testing Ln", city: "Los Angeles", state: "CA", zip: "90001", country: "USA",
      ownerId: ownerFull.id, approvalStatus: "APPROVED", type: "Apartment",
      units: { create: [
        { name: "201", type: "Apartment", rentAmount: 2000, depositAmt: 2500, rooms: 1, sqFootage: 800, status: "OCCUPIED" },
        { name: "202", type: "Apartment", rentAmount: 2000, depositAmt: 2500, rooms: 1, sqFootage: 800, status: "OCCUPIED" },
        { name: "203", type: "Apartment", rentAmount: 2000, depositAmt: 2500, rooms: 1, sqFootage: 800, status: "OCCUPIED" },
        { name: "204", type: "Apartment", rentAmount: 2000, depositAmt: 2500, rooms: 1, sqFootage: 800, status: "OCCUPIED" },
        { name: "205", type: "Apartment", rentAmount: 2000, depositAmt: 2500, rooms: 1, sqFootage: 800, status: "OCCUPIED" },
        { name: "206", type: "Apartment", rentAmount: 2000, depositAmt: 2500, rooms: 1, sqFootage: 800, status: "OCCUPIED" },
        { name: "207", type: "Apartment", rentAmount: 2000, depositAmt: 2500, rooms: 1, sqFootage: 800, status: "OCCUPIED" }
      ]}
    },
    include: { units: true }
  });

  // Lease E1: INSPECTION_SCHEDULED
  await prisma.lease.create({
    data: {
      unitId: propB.units[0].id, tenantId: tenantMoveOutScheduled.id, status: "ACTIVE", startDate: dateBefore(12), endDate: new Date(), monthlyRent: 2000, securityDeposit: 2500, depositPaidAt: dateBefore(12), depositPaidAmount: 2500, depositBalance: 2500, depositStatus: "HELD",
      moveOutStatus: "INSPECTION_SCHEDULED", moveOutRequestDate: dateBefore(1), moveOutDate: new Date(), moveOutReason: "End of lease", inspectionDate: dateAfter(1)
    }
  });

  // Lease E2: OWNER_REVIEWING (Inspection Completed, zero deductions)
  await prisma.lease.create({
    data: {
      unitId: propB.units[1].id, tenantId: tenantMoveOutCompleted.id, status: "ACTIVE", startDate: dateBefore(12), endDate: new Date(), monthlyRent: 2000, securityDeposit: 2500, depositPaidAt: dateBefore(12), depositPaidAmount: 2500, depositBalance: 2500, depositStatus: "HELD",
      moveOutStatus: "OWNER_REVIEWING", moveOutRequestDate: dateBefore(2), moveOutDate: dateBefore(1), moveOutReason: "End of lease", inspectionDate: dateBefore(1), inspectionNotes: "Stains on carpet in bedroom.", deductions: [{ amount: 0.00, description: "Carpet cleaning", category: "CLEANING" }]
    }
  });

  // Lease E3: TENANT_ACCEPTED
  await prisma.lease.create({
    data: {
      unitId: propB.units[2].id, tenantId: tenantMoveOutAccepted.id, status: "ACTIVE", startDate: dateBefore(12), endDate: new Date(), monthlyRent: 2000, securityDeposit: 2500, depositPaidAt: dateBefore(12), depositPaidAmount: 2500, depositBalance: 2500, depositStatus: "HELD",
      moveOutStatus: "TENANT_ACCEPTED", moveOutRequestDate: dateBefore(3), moveOutDate: dateBefore(2), moveOutReason: "End of lease", inspectionDate: dateBefore(2), inspectionNotes: "Minor wall scuffs.", deductions: [{ amount: 100, description: "Paint touch-up" }]
    }
  });

  // Lease E4: TENANT_DISPUTED
  await prisma.lease.create({
    data: {
      unitId: propB.units[3].id, tenantId: tenantMoveOutDisputed.id, status: "ACTIVE", startDate: dateBefore(12), endDate: new Date(), monthlyRent: 2000, securityDeposit: 2500, depositPaidAt: dateBefore(12), depositPaidAmount: 2500, depositBalance: 2500, depositStatus: "HELD",
      moveOutStatus: "TENANT_DISPUTED", moveOutRequestDate: dateBefore(4), moveOutDate: dateBefore(3), moveOutReason: "End of lease", inspectionDate: dateBefore(3), inspectionNotes: "Broken window blind.", tenantDisputeNote: "I have photos proving the blind was broken before I moved in.", deductions: [{ amount: 150, description: "Window blind replacement" }]
    }
  });

  // Lease E5: NOTICE_GIVEN (Limbo State with unpaid invoice)
  const leasePending = await prisma.lease.create({
    data: {
      unitId: propB.units[4].id, tenantId: tenantMoveOutPending.id, status: "NOTICE_GIVEN", startDate: dateBefore(12), endDate: dateAfter(14), monthlyRent: 2000, securityDeposit: 2500, depositPaidAt: dateBefore(12), depositPaidAmount: 2500, depositBalance: 2500, depositStatus: "HELD",
      moveOutStatus: "MOVE_OUT_REQUESTED", moveOutRequestDate: dateBefore(1), moveOutDate: dateAfter(14), moveOutReason: "Job transfer"
    }
  });

  // Lease E6: KEYS_RETURNED (Decoupled state awaiting owner decision)
  await prisma.lease.create({
    data: {
      unitId: propB.units[5].id, tenantId: tenantMoveOutKeys.id, status: "NOTICE_GIVEN", startDate: dateBefore(12), endDate: dateAfter(5), monthlyRent: 2000, securityDeposit: 2500, depositPaidAt: dateBefore(12), depositPaidAmount: 2500, depositBalance: 2500, depositStatus: "HELD",
      moveOutStatus: "KEYS_RETURNED", moveOutRequestDate: dateBefore(2), moveOutDate: dateAfter(5), moveOutReason: "Bought a house", actualMoveOutDate: dateBefore(1), keyReturnConfirmedAt: dateBefore(1), depositDueBy: dateAfter(20)
    }
  });

  // Lease E7: Skipped Inspection (Bypassed directly to owner reviewing)
  await prisma.lease.create({
    data: {
      unitId: propB.units[6].id, tenantId: tenantMoveOutSkipped.id, status: "ACTIVE", startDate: dateBefore(12), endDate: dateAfter(5), monthlyRent: 2000, securityDeposit: 2500, depositPaidAt: dateBefore(12), depositPaidAmount: 2500, depositBalance: 2500, depositStatus: "HELD",
      moveOutStatus: "OWNER_REVIEWING", moveOutRequestDate: dateBefore(2), moveOutDate: dateAfter(5), moveOutReason: "End of lease", actualMoveOutDate: dateBefore(1), keyReturnConfirmedAt: dateBefore(1), depositDueBy: dateAfter(20),
      moveOutBypassReason: "Skipped physical inspection - returning full deposit", moveOutBypassAcknowledgedAt: dateBefore(1), deductions: []
    }
  });

  await prisma.invoice.create({
    data: {
      leaseId: leasePending.id, amount: 2000, dueDate: dateBefore(5), status: "UNPAID", invoiceType: "RENT", note: "Final month rent unpaid"
    }
  });

  // Lease F: tenant_expired - Expired lease, deposit returned with deductions
  const leaseExpired = await prisma.lease.create({
    data: {
      unitId: u105.id, tenantId: tenantExpired.id, status: "EXPIRED",
      startDate: dateBefore(14), endDate: dateBefore(2), monthlyRent: 2800, securityDeposit: 3000,
      depositPaidAt: dateBefore(14), depositPaidAmount: 3000, depositBalance: 0,
      depositStatus: "REFUNDED", refundMethod: "BANK_TRANSFER", refundRef: "REF-XP-99",
      moveOutStatus: "COMPLETED", moveOutDate: dateBefore(2),
      deductions: [
        { amount: 150.00, description: "Deep cleaning fee" },
        { amount: 200.00, description: "Door replacement" }
      ]
    }
  });
  await prisma.payoutRequest.create({
    data: {
      tenantId: tenantExpired.id, leaseId: leaseExpired.id, amount: 2650, status: PayoutStatus.COMPLETED,
      bankName: "Wells Fargo", accountNumber: encrypt("999988887777"), accountName: "Eve Expired", disbursedAt: dateBefore(2)
    }
  });

  // 8. Maintenance Tickets (Tied strictly to tenant_maintenance and inspector_busy)
  console.log("Creating Maintenance Requests...");

  // Scenario 1: SUBMITTED (needs assignment)
  await prisma.maintenanceRequest.create({
    data: {
      unitId: u106.id, tenantId: tenantMaintenance.id, title: "Smoke Detector Beeping",
      description: "Low battery alarm going off continuously.", priority: "LOW", status: "SUBMITTED",
      category: "GENERAL", entryPermission: true
    }
  });

  // Scenario 2: SUBMITTED 2 (for stats card verify)
  await prisma.maintenanceRequest.create({
    data: {
      unitId: u106.id, tenantId: tenantMaintenance.id, title: "Roof Gutter Blocked",
      description: "Water backing up and spilling over roof during rainfall.", priority: "MEDIUM", status: "SUBMITTED",
      category: "GENERAL", entryPermission: true
    }
  });

  // Scenario 3: ASSIGNED (Jake assigned)
  const ticketHvac = await prisma.maintenanceRequest.create({
    data: {
      unitId: u106.id, tenantId: tenantMaintenance.id, title: "HVAC Blowing Warm Air",
      description: "Central AC system is not chilling. Ambient temp is 85F.", priority: "HIGH", status: "ASSIGNED",
      category: "APPLIANCE", inspectorId: inspectorBusy.id, scheduledDate: dateAfter(1),
      entryPermission: true
    }
  });

  // Scenario 4: DIAGNOSIS_SCHEDULED
  await prisma.maintenanceRequest.create({
    data: {
      unitId: u106.id, tenantId: tenantMaintenance.id, title: "Dishwasher Leak",
      description: "Puddle forms below front panel when running a cycle.", priority: "MEDIUM", status: "ASSIGNED",
      category: "APPLIANCE", inspectorId: inspectorBusy.id, diagnosisDate: dateBefore(1),
      entryPermission: true
    }
  });

  // Scenario 5: AWAITING_APPROVAL (Above owner threshold)
  await prisma.maintenanceRequest.create({
    data: {
      unitId: u106.id, tenantId: tenantMaintenance.id, title: "Water Heater Corroded",
      description: "Water heater leaking heavily from main tank base.", priority: "HIGH", status: "AWAITING_APPROVAL",
      category: "PLUMBING", inspectorId: inspectorBusy.id, estimatedLabor: 800.00, estimatedMaterials: 450.00,
      inspectorNotes: "Complete system rot. Recommending total replacement."
    }
  });

  // Scenario 6: PENDING_TENANT_CONFIRMATION (with undecided chargeback decision)
  await prisma.maintenanceRequest.create({
    data: {
      unitId: u106.id, tenantId: tenantMaintenance.id, title: "Shattered Sliding Glass",
      description: "Back patio door glass pane is completely cracked.", priority: "HIGH", status: "PENDING_TENANT_CONFIRMATION",
      category: "GENERAL", finalLabor: 250.00, finalMaterials: 300.00,
      vendorReportedFault: true, ownerChargebackDecision: null
    }
  });

  // Scenario 7: CLOSED (normal wear & tear)
  await prisma.maintenanceRequest.create({
    data: {
      unitId: u106.id, tenantId: tenantMaintenance.id, title: "Stiff Main Deadbolt",
      description: "Struggling to lock/unlock front door deadbolt.", priority: "LOW", status: "CLOSED",
      category: "GENERAL", finalLabor: 60.00, finalMaterials: 15.00,
      vendorReportedFault: false, ownerChargebackDecision: "WEAR_AND_TEAR"
    }
  });

  // Scenario 8: CLOSED (Tenant fault, deposit deduction)
  const ticketDeduct = await prisma.maintenanceRequest.create({
    data: {
      unitId: u106.id, tenantId: tenantMaintenance.id, title: "Bent Kitchen Drawer Track",
      description: "Drawer yanked off its sliders.", priority: "LOW", status: "CLOSED",
      category: "GENERAL", finalLabor: 30.00, finalMaterials: 0.00,
      vendorReportedFault: true, ownerChargebackDecision: "TENANT_FAULT",
      chargebackSource: "DEPOSIT", chargebackDepositAmount: 30.00, chargebackInvoiceAmount: 0.00
    }
  });
  await prisma.transaction.create({
    data: {
      type: "EXPENSE", category: "DEPOSIT", amount: 30.00,
      reference: `DEPOSIT_DEDUCT_${ticketDeduct.id.slice(-6)}`, status: "COMPLETED",
      tenantId: tenantMaintenance.id
    }
  });

  // Scenario 9: Dispatched to External Vendor (Assigned to Inspector but should be filtered out of active tasks)
  await prisma.maintenanceRequest.create({
    data: {
      unitId: u106.id, tenantId: tenantMaintenance.id, title: "Burst Pipe in Basement",
      description: "Water leaking fast, emergency plumber dispatched.", priority: "EMERGENCY", status: "ASSIGNED",
      category: "PLUMBING", inspectorId: inspectorBusy.id, externalVendorId: vendorPlumber.id,
      entryPermission: true
    }
  });

  // 9. Financial Ledger Data (Historical records for dashboard charts)
  console.log("Seeding financial ledger records...");
  const rentPayments = [
    { month: 5, amount: 3000 }, { month: 4, amount: 3000 },
    { month: 3, amount: 3000 }, { month: 2, amount: 3000 },
    { month: 1, amount: 3000 }, { month: 0, amount: 3000 }
  ];
  for (const p of rentPayments) {
    const inv = await prisma.invoice.create({
      data: { leaseId: leasePerfect.id, amount: p.amount, dueDate: dateBefore(p.month), status: "PAID", paymentMethod: "STRIPE", grossPaid: p.amount * 1.02, processingFee: p.amount * 0.02, adminFee: p.amount * 0.01, netToOwner: p.amount * 0.99, invoiceType: "RENT" }
    });
    await prisma.transaction.create({
      data: { type: "INCOME", category: "RENT", amount: p.amount, status: "COMPLETED", tenantId: tenantPerfect.id, invoiceId: inv.id, createdAt: dateBefore(p.month) }
    });
  }

  // Pending and Completed Owner Payouts
  await prisma.payoutRequest.create({
    data: { ownerId: ownerFull.id, amount: 8000, status: PayoutStatus.PENDING, bankName: "Chase Bank", accountNumber: encrypt("111122223333"), accountName: "Atlas Escrow" }
  });
  await prisma.payoutRequest.create({
    data: { ownerId: ownerFull.id, amount: 12000, status: PayoutStatus.COMPLETED, bankName: "Chase Bank", accountNumber: encrypt("111122223333"), accountName: "Atlas Escrow", disbursedAt: dateBefore(4), proofUrl: "https://example.com/receipt.pdf" }
  });

  // 10. Documents
  console.log("Uploading documents...");
  await prisma.document.create({ data: { name: "Lease_Perfect_Adam.pdf", url: "https://example.com/dummy.pdf", category: "LEASE", type: "Lease", description: "Fully executed lease", fileSize: "1.2 MB", tenantId: tenantPerfect.id, propertyId: propA.id } });
  await prisma.document.create({ data: { name: "ID_Marvin.jpg", url: "https://example.com/id.jpg", category: "IDENTIFICATION", type: "Identification", fileSize: "320 KB", tenantId: tenantMaintenance.id, propertyId: propA.id } });

  // 11. Custom Invitation Token (tests direct link onboarding)
  await prisma.tenantInvitation.create({
    data: {
      token: "TEST-INVITE-TOKEN-001",
      tenantEmail: "tenant_invited@propertypro.test",
      tenantName: "Invited Iris",
      unitId: u101.id,
      propertyId: propA.id,
      monthlyRent: 2000,
      leaseStartDate: dateAfter(0),
      status: "PENDING",
      invitedByOwnerId: ownerFull.id,
      expiresAt: dateAfter(1)
    }
  });

  // 12. Messages (Rich threads between personas)
  console.log("Writing message threads...");
  
  // Thread 1: tenantPerfect (Adam) <-> ownerFull (Atlas Owner)
  const convPerfectOwner = [tenantPerfect.id, ownerFull.id].sort().join("_");
  await prisma.message.create({ data: { senderId: tenantPerfect.id, receiverId: ownerFull.id, content: "Hello! I paid my rent for this month. Just wanted to double check if you saw it.", conversationId: convPerfectOwner } });
  await prisma.message.create({ data: { senderId: ownerFull.id, receiverId: tenantPerfect.id, content: "Yes Adam, thank you. We received it and the invoice is now marked as Paid in your dashboard.", isRead: true, conversationId: convPerfectOwner } });

  // Thread 2: tenantMaintenance (Marvin) <-> inspectorBusy (Jake)
  const convMaintInspector = [tenantMaintenance.id, inspectorBusy.id].sort().join("_");
  await prisma.message.create({ data: { senderId: tenantMaintenance.id, receiverId: inspectorBusy.id, content: "Hey Jake, is the HVAC repair scheduled for Thursday still on?", conversationId: convMaintInspector, ticketId: ticketHvac.id } });
  await prisma.message.create({ data: { senderId: inspectorBusy.id, receiverId: tenantMaintenance.id, content: "Yes, I will be there sharp at 10 AM. Please ensure entry gate codes are correct.", isRead: true, conversationId: convMaintInspector, ticketId: ticketHvac.id } });

  // Thread 3: ownerFull <-> inspectorBusy (Jake)
  const convOwnerInspector = [ownerFull.id, inspectorBusy.id].sort().join("_");
  await prisma.message.create({ data: { senderId: inspectorBusy.id, receiverId: ownerFull.id, content: "Estimate for Unit 106 HVAC compressor is submitted. Needs approval.", conversationId: convOwnerInspector } });
  await prisma.message.create({ data: { senderId: ownerFull.id, receiverId: inspectorBusy.id, content: "Approved. Please schedule the fix ASAP.", isRead: true, conversationId: convOwnerInspector } });

  // 13. Notifications
  console.log("Seeding system alerts...");
  await prisma.notification.create({ data: { userId: ownerFull.id, title: "Maintenance Estimate", message: "Jake submitted an estimate of $1,250 for Unit 106.", type: "MAINTENANCE" } });
  await prisma.notification.create({ data: { userId: tenantPerfect.id, title: "Rent Receipt", message: "Receipt for May Rent ($3,000) generated successfully.", type: "BILLING", isRead: true } });
  await prisma.notification.create({ data: { userId: tenantOverdue.id, title: "Late Fee Applied", message: "A $50.00 late fee was added to your invoice.", type: "BILLING" } });
  await prisma.notification.create({ data: { userId: admin.id, title: "Payout Request", message: "Atlas Properties LLC requested a $8,000 disbursement.", type: "BILLING" } });

  // 14. Tenant Applications
  console.log("Seeding tenant applications...");
  await prisma.application.create({
    data: {
      unitId: u104.id,
      name: "Alice Applicant",
      email: "alice.app@example.com",
      phone: "555-111-2222",
      status: "PENDING",
      leaseDuration: 12,
      moveInDate: dateAfter(1),
      occupantsCount: 2,
      employerName: "Tech Corp",
      jobTitle: "Software Engineer",
      monthlyIncome: 8500,
      hasGuarantor: false,
      prevLandlordName: "Bob Builder",
      prevLandlordPhone: "555-999-8888",
      reasonForMoving: "Looking for a larger space",
      petsCount: 1,
      petDetails: "1 small dog (Pug)",
      vehicleInfo: "2020 Honda Civic (ABC-1234)",
      emergencyContactName: "Alan Applicant",
      emergencyContactPhone: "555-222-3333",
      emergencyContactRelation: "Father",
      backgroundCheckConsent: true,
      agreedToTerms: true,
      idDocumentUrl: "https://example.com/alice_id.jpg",
      incomeProofUrl: "https://example.com/alice_paystub.pdf"
    }
  });

  await prisma.application.create({
    data: {
      unitId: u105.id,
      name: "Charlie Co-Signer",
      email: "charlie.app@example.com",
      phone: "555-333-4444",
      status: "APPROVED",
      leaseDuration: 6,
      moveInDate: dateAfter(0),
      occupantsCount: 1,
      employerName: "Cafe Local",
      jobTitle: "Barista",
      monthlyIncome: 2000,
      hasGuarantor: true,
      guarantorName: "Daddy Warbucks",
      guarantorEmail: "daddy@warbucks.com",
      guarantorPhone: "555-100-1000",
      guarantorIncome: 25000,
      prevLandlordName: "N/A",
      reasonForMoving: "First apartment",
      petsCount: 0,
      emergencyContactName: "Daddy Warbucks",
      emergencyContactPhone: "555-100-1000",
      emergencyContactRelation: "Father",
      backgroundCheckConsent: true,
      agreedToTerms: true,
      idDocumentUrl: "https://example.com/charlie_id.jpg",
      incomeProofUrl: "https://example.com/charlie_bank.pdf"
    }
  });

  await prisma.application.create({
    data: {
      unitId: propHouse.units[0].id,
      name: "Denise Denied",
      email: "denise.app@example.com",
      phone: "555-555-5555",
      status: "REJECTED",
      rejectionReason: "Credit score below minimum requirement and negative landlord reference.",
      leaseDuration: 24,
      moveInDate: dateAfter(2),
      occupantsCount: 4,
      employerName: "Self Employed",
      jobTitle: "Consultant",
      monthlyIncome: 4000,
      hasGuarantor: false,
      prevLandlordName: "Angry Andy",
      prevLandlordPhone: "555-666-7777",
      reasonForMoving: "Evicted",
      petsCount: 3,
      petDetails: "3 large dogs",
      emergencyContactName: "Brother Denied",
      emergencyContactPhone: "555-555-5556",
      emergencyContactRelation: "Brother",
      backgroundCheckConsent: false, // Refused consent
      agreedToTerms: true,
      idDocumentUrl: "https://example.com/denise_id.jpg",
      incomeProofUrl: "https://example.com/denise_taxes.pdf"
    }
  });

  // 15. Owner Applications (Admin queue)
  await prisma.ownerApplication.create({ data: { name: "Pending LLC", email: "pending_owner@example.com", phone: "555-123-4567", entityType: "Property Management", portfolioSize: "1-5", status: "PENDING", trackingId: "trk_pending123" } });
  await prisma.ownerApplication.create({ data: { name: "Review Corp", email: "review_owner@example.com", phone: "555-987-6543", entityType: "Real Estate Investor", portfolioSize: "50+", status: "UNDER_REVIEW", trackingId: "trk_review456" } });
  await prisma.ownerApplication.create({ data: { name: "Rejected Solo", email: "rejected@example.com", phone: "555-000-0000", entityType: "Independent Landlord", portfolioSize: "1-5", status: "REJECTED", rejectionReason: "Invalid business license details.", trackingId: "trk_reject789" } });

  // 16. Move-out Flow specific credentials
  console.log("Seeding move-out flow specific credentials...");
  
  const ownerMoveOut = await prisma.user.create({
    data: { email: "owner_moveout@propertypro.test", name: "Move-out Owner", password: passwordHash, role: Role.OWNER, bankName: "Chase Bank", accountNumber: encrypt("123123123"), accountName: "Owner Escrow", balance: 50000, currentTierId: proTierId, subscriptionStatus: "Active", accountStatus: "ACTIVE", creditScore: 780, hasCompletedOnboarding: true, onboardingStep: 4 }
  });

  const inspectorMoveOut = await prisma.user.create({
    data: { email: "inspector_moveout@propertypro.test", name: "Inspector Moveout", password: passwordHash, role: Role.INSPECTOR, phone: "+1 555-444-5555" }
  });

  const tenantOwnerInspect = await prisma.user.create({
    data: { email: "tenant_owner_inspect@propertypro.test", name: "Owner Inspect Tenant", password: passwordHash, role: Role.TENANT, tenantStatus: "Active", creditScore: 750, annualIncome: 90000, ssn: encrypt("111-22-3333") }
  });

  const tenantDamages = await prisma.user.create({
    data: { email: "tenant_damages@propertypro.test", name: "Damages Tenant", password: passwordHash, role: Role.TENANT, tenantStatus: "Active", creditScore: 750, annualIncome: 90000, ssn: encrypt("111-22-3334") }
  });

  const tenantNoDamage = await prisma.user.create({
    data: { email: "tenant_nodamage@propertypro.test", name: "No Damage Tenant", password: passwordHash, role: Role.TENANT, tenantStatus: "Active", creditScore: 750, annualIncome: 90000, ssn: encrypt("111-22-3335") }
  });

  const propMoveOut = await prisma.property.create({
    data: {
      name: "Move-Out Focus Apartments", address: "100 Moveout Ave", city: "Los Angeles", state: "CA", zip: "90001", country: "USA", ownerId: ownerMoveOut.id, approvalStatus: "APPROVED", type: "Apartment",
      units: { create: [
        { name: "M101", type: "Apartment", rentAmount: 2000, depositAmt: 2500, rooms: 1, sqFootage: 800, status: "OCCUPIED" },
        { name: "M102", type: "Apartment", rentAmount: 2000, depositAmt: 2500, rooms: 1, sqFootage: 800, status: "OCCUPIED" },
        { name: "M103", type: "Apartment", rentAmount: 2000, depositAmt: 2500, rooms: 1, sqFootage: 800, status: "OCCUPIED" }
      ]}
    },
    include: { units: true }
  });

  // Scenario 1: Owner self inspect (no inspector assigned)
  await prisma.lease.create({
    data: {
      unitId: propMoveOut.units[0].id, tenantId: tenantOwnerInspect.id, status: "ACTIVE", startDate: dateBefore(12), endDate: new Date(), monthlyRent: 2000, securityDeposit: 2500, depositPaidAt: dateBefore(12), depositPaidAmount: 2500, depositBalance: 2500, depositStatus: "HELD",
      moveOutStatus: "MOVE_OUT_REQUESTED", moveOutRequestDate: dateBefore(2), moveOutDate: dateAfter(0), moveOutReason: "End of lease",
      forwardingAddress: "789 Tenant Move Way, San Jose, CA 95112", refundMethod: "OFFLINE", refundBankName: "Chase Bank", refundAccountName: "Owner Inspect Refund", refundAccountNumber: encrypt("123456789"),
      cleaningAcknowledgedAt: dateBefore(2), utilitiesAcknowledgedAt: dateBefore(2)
    }
  });

  // Scenario 2: Inspector sees damages (INSPECTION_SCHEDULED, inspector assigned)
  await prisma.lease.create({
    data: {
      unitId: propMoveOut.units[1].id, tenantId: tenantDamages.id, status: "ACTIVE", startDate: dateBefore(12), endDate: new Date(), monthlyRent: 2000, securityDeposit: 2500, depositPaidAt: dateBefore(12), depositPaidAmount: 2500, depositBalance: 2500, depositStatus: "HELD",
      moveOutStatus: "INSPECTION_SCHEDULED", moveOutRequestDate: dateBefore(3), moveOutDate: dateBefore(1), moveOutReason: "End of lease", moveOutInspectorId: inspectorMoveOut.id, preliminaryInspectorId: inspectorMoveOut.id, preliminaryInspectionStatus: "SCHEDULED", inspectionDate: dateAfter(1),
      forwardingAddress: "456 Damages Rd, Los Angeles, CA 90025", refundMethod: "OFFLINE", refundBankName: "Bank of America", refundAccountName: "Damages Tenant Refund", refundAccountNumber: encrypt("987654321"),
      cleaningAcknowledgedAt: dateBefore(3), utilitiesAcknowledgedAt: dateBefore(3)
    }
  });

  // Scenario 3: No damage there (INSPECTION_SCHEDULED, inspector assigned)
  await prisma.lease.create({
    data: {
      unitId: propMoveOut.units[2].id, tenantId: tenantNoDamage.id, status: "ACTIVE", startDate: dateBefore(12), endDate: new Date(), monthlyRent: 2000, securityDeposit: 2500, depositPaidAt: dateBefore(12), depositPaidAmount: 2500, depositBalance: 2500, depositStatus: "HELD",
      moveOutStatus: "INSPECTION_SCHEDULED", moveOutRequestDate: dateBefore(4), moveOutDate: dateBefore(2), moveOutReason: "End of lease", moveOutInspectorId: inspectorMoveOut.id, preliminaryInspectorId: inspectorMoveOut.id, preliminaryInspectionStatus: "SCHEDULED", inspectionDate: dateAfter(1),
      forwardingAddress: "321 Clean Street, San Francisco, CA 94103", refundMethod: "OFFLINE", refundBankName: "Wells Fargo", refundAccountName: "No Damage Tenant Refund", refundAccountNumber: encrypt("555444333"),
      cleaningAcknowledgedAt: dateBefore(4), utilitiesAcknowledgedAt: dateBefore(4)
    }
  });

  console.log("==========================================");
  console.log("✅ SANDBOX COMPREHENSIVE SEED COMPLETE!");
  console.log("==========================================");
}

main()
  .catch((e) => {
    console.error("Seeding failed:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
