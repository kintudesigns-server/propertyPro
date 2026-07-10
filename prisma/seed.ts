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
  console.log("Wiping existing database...");
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
  const passwordHash = await bcrypt.hash("password123", 10);

  await prisma.platformSettings.create({ data: { adminFeePercent: 2.00 } });

  const tiers = await Promise.all([
    prisma.pricingTier.create({ data: { name: "Hobbyist", description: "Landlords starting out", price: 0, minUnits: 1, maxUnits: 2, features: ["Up to 2 Units"] } }),
    prisma.pricingTier.create({ data: { name: "Starter", description: "Independent landlords", price: 29, minUnits: 3, maxUnits: 15, features: ["Up to 15 Units", "Ticketing"] } }),
    prisma.pricingTier.create({ data: { name: "Professional", description: "Growing portfolio", price: 79, minUnits: 16, maxUnits: 50, features: ["Up to 50 Units", "Priority Support"] } }),
    prisma.pricingTier.create({ data: { name: "Enterprise", description: "Large companies", price: 149, minUnits: 51, maxUnits: 9999, features: ["Unlimited Units", "Custom API"], isCustom: true } })
  ]);
  const proTierId = tiers[2].id;
  const starterTierId = tiers[1].id;

  // 1. Core Users
  const admin = await prisma.user.create({
    data: { email: "admin@example.com", name: "Super Admin", password: passwordHash, role: Role.SUPERADMIN }
  });

  const owner = await prisma.user.create({
    data: {
      email: "owner@example.com", name: "Premium Properties LLC", password: passwordHash, role: Role.OWNER,
      bankName: "Chase Bank", accountNumber: encrypt("111122223333"), accountName: "Premium Props", balance: 15680.50,
      currentTierId: proTierId, subscriptionStatus: "Active", accountStatus: "ACTIVE",
      creditScore: 780, hasCompletedOnboarding: true, onboardingStep: 4
    }
  });

  const owner2 = await prisma.user.create({
    data: {
      email: "owner2@example.com", name: "Secondary Owner LLC", password: passwordHash, role: Role.OWNER,
      bankName: "Wells Fargo", accountNumber: encrypt("444455556666"), accountName: "Secondary Props", balance: 3450.00,
      currentTierId: starterTierId, subscriptionStatus: "Active", accountStatus: "ACTIVE",
      creditScore: 710, hasCompletedOnboarding: true, onboardingStep: 4
    }
  });

  const inspector = await prisma.user.create({
    data: { email: "inspector@example.com", name: "Mike The Inspector", password: passwordHash, role: Role.INSPECTOR, phone: "+1 555-111-2222" }
  });

  // Tenants
  const tOnboarding = await prisma.user.create({
    data: { email: "newtenant@example.com", name: "Onboarding Olivia", password: passwordHash, role: Role.TENANT, tenantStatus: "Pending Onboarding", creditScore: 680, annualIncome: 24000, ssn: encrypt("000-12-3456") }
  });

  const tActive = await prisma.user.create({
    data: { email: "activetenant@example.com", name: "Active Adam", password: passwordHash, role: Role.TENANT, tenantStatus: "Active", creditScore: 750, annualIncome: 110000, ssn: encrypt("000-34-5678") }
  });

  const tOverdue = await prisma.user.create({
    data: { email: "overdue@example.com", name: "Overdue Oscar", password: passwordHash, role: Role.TENANT, tenantStatus: "Active", creditScore: 610, annualIncome: 48000, ssn: encrypt("000-56-7890") }
  });

  const tLeaving = await prisma.user.create({
    data: { email: "leavingtenant@example.com", name: "Leaving Liam", password: passwordHash, role: Role.TENANT, tenantStatus: "Active", creditScore: 640, annualIncome: 55000, ssn: encrypt("000-78-9012") }
  });

  const tExpired = await prisma.user.create({
    data: { email: "expired@example.com", name: "Expired Eve", password: passwordHash, role: Role.TENANT, tenantStatus: "Inactive", creditScore: 790, annualIncome: 85000, ssn: encrypt("000-90-1234") }
  });

  // 2. External Vendors
  const vendorPlumber = await prisma.externalVendor.create({
    data: { name: "FastFix Plumbing Co.", email: "plumber@vendor.com", phone: "+1 555-300-1111", specialty: "Plumbing", w9OnFile: true, insuranceOnFile: true, baseCallOutFee: 75.0, ownerId: owner.id, bankName: "Bank of America", routingNumber: encrypt("026009593"), accountNumber: encrypt("987654321") }
  });

  const vendorSpark = await prisma.externalVendor.create({
    data: { name: "Bright Spark Electric", email: "electric@vendor.com", phone: "+1 555-300-2222", specialty: "Electrical", w9OnFile: true, insuranceOnFile: false, baseCallOutFee: 95.0, ownerId: owner.id }
  });

  // 3. Owner Applications
  await prisma.ownerApplication.create({ data: { name: "Pending LLC", email: "pending_owner@example.com", phone: "555-123-4567", entityType: "Property Management", portfolioSize: "1-5", status: "PENDING", trackingId: "trk_pending123" } });
  await prisma.ownerApplication.create({ data: { name: "Review Corp", email: "review_owner@example.com", phone: "555-987-6543", entityType: "Real Estate Investor", portfolioSize: "50+", status: "UNDER_REVIEW", trackingId: "trk_review456" } });
  await prisma.ownerApplication.create({ data: { name: "Rejected Solo", email: "rejected@example.com", phone: "555-000-0000", entityType: "Independent Landlord", portfolioSize: "1-5", status: "REJECTED", rejectionReason: "KYC incomplete.", trackingId: "trk_reject789" } });

  // 4. Properties & Units
  console.log("Creating Properties and Units...");
  const propA = await prisma.property.create({
    data: {
      name: "Grand Horizon Towers", address: "100 Grand Ave", city: "Los Angeles", state: "CA", zip: "90015", country: "USA",
      ownerId: owner.id, approvalStatus: "APPROVED", type: "Apartment",
      units: { create: [
        { name: "101", type: "Apartment", rentAmount: 2000, depositAmt: 2500, rooms: 1, sqFootage: 800, status: "VACANT" },
        { name: "102", type: "Apartment", rentAmount: 3000, depositAmt: 3500, rooms: 2, sqFootage: 1200, status: "OCCUPIED" },
        { name: "103", type: "Apartment", rentAmount: 4500, depositAmt: 5000, rooms: 3, sqFootage: 1800, status: "OCCUPIED" },
        { name: "104", type: "Apartment", rentAmount: 3200, depositAmt: 3500, rooms: 2, sqFootage: 1300, status: "OCCUPIED" },
        { name: "105", type: "Apartment", rentAmount: 2800, depositAmt: 3000, rooms: 2, sqFootage: 1100, status: "OCCUPIED" }
      ]}
    },
    include: { units: true }
  });
  const u101 = propA.units.find(u => u.name === "101")!;
  const u102 = propA.units.find(u => u.name === "102")!;
  const u103 = propA.units.find(u => u.name === "103")!;
  const u104 = propA.units.find(u => u.name === "104")!;
  const u105 = propA.units.find(u => u.name === "105")!;

  const propHouse = await prisma.property.create({
    data: {
      name: "Sunset Villa", address: "400 Sunset Blvd", city: "Los Angeles", state: "CA", zip: "90028", country: "USA",
      ownerId: owner.id, approvalStatus: "APPROVED", type: "House",
      units: { create: [
        { name: "Main House", type: "House", rentAmount: 5500, depositAmt: 5500, rooms: 4, sqFootage: 2800, status: "VACANT" }
      ]}
    },
    include: { units: true }
  });
  
  const propComm = await prisma.property.create({
    data: {
      name: "Downtown Tech Plaza", address: "888 Silicon Way", city: "Los Angeles", state: "CA", zip: "90012", country: "USA",
      ownerId: owner.id, approvalStatus: "APPROVED", type: "Commercial", zoningType: "Mixed-Use", parkingSpaces: 150,
      coverPhoto: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800",
      units: { create: [
        { name: "Suite 100", type: "Retail", rentAmount: 8500, depositAmt: 8500, rooms: 0, sqFootage: 4500, status: "VACANT", leaseStructure: "NNN", camCharges: 400 },
        { name: "Suite 200", type: "Office", rentAmount: 4200, depositAmt: 4200, rooms: 0, sqFootage: 2100, status: "VACANT", leaseStructure: "Gross" },
      ]}
    }
  });

  const propPending = await prisma.property.create({
    data: {
      name: "Miami Luxury Villa", address: "500 Ocean Dr", city: "Miami", state: "FL", zip: "33139", country: "USA",
      ownerId: owner2.id, approvalStatus: "PENDING", type: "House",
      units: { create: [{ name: "Villa A", type: "House", rentAmount: 12000, depositAmt: 20000, rooms: 6, sqFootage: 5500, status: "VACANT" }] }
    }
  });

  // Tours & Applications
  await prisma.tour.create({ data: { propertyId: propA.id, unitId: u101.id, tenantName: "Applicant Andy", tenantEmail: "applicant@example.com", tenantPhone: "555-999-0000", scheduledAt: new Date(), status: TourStatus.COMPLETED, tourType: TourType.IN_PERSON, feedbackRating: 5, feedbackComments: "Beautiful!" } });
  
  // Seed a pending tour for owners to confirm/cancel
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  await prisma.tour.create({ data: { propertyId: propA.id, unitId: u101.id, tenantName: "Sarah Connor", tenantEmail: "sarah@example.com", tenantPhone: "555-111-2222", scheduledAt: tomorrow, status: TourStatus.PENDING, tourType: TourType.VIDEO_CALL } });

  // Seed a confirmed tour
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  await prisma.tour.create({ data: { propertyId: propA.id, unitId: u102.id, tenantName: "John Doe", tenantEmail: "john@example.com", tenantPhone: "555-222-3333", scheduledAt: nextWeek, status: TourStatus.CONFIRMED, tourType: TourType.IN_PERSON } });

  await prisma.application.create({ data: { unitId: u101.id, name: "Applicant Andy", email: "applicant@example.com", phone: "555-999-0000", status: "APPROVED", monthlyIncome: 7500, employerName: "Acme Corp", jobTitle: "Engineer", occupantsCount: 1, moveInDate: new Date(), leaseDuration: 12 } });

  // 5. Leases Lifecycle & Deposit Balances
  console.log("Creating Leases and Invoices...");
  const dateBefore = (m: number) => { const d = new Date(); d.setMonth(d.getMonth() - m); return d; };
  const dateAfter = (m: number) => { const d = new Date(); d.setMonth(d.getMonth() + m); return d; };

  // Lease A: Onboarding (Pending Signature, Deposit unpaid)
  const leaseOnboarding = await prisma.lease.create({
    data: {
      unitId: u101.id, tenantId: tOnboarding.id, status: "PENDING_SIGNATURE",
      startDate: new Date(), endDate: dateAfter(12), monthlyRent: 2000, securityDeposit: 2500,
      depositStatus: "HELD", depositBalance: 0.00
    }
  });
  await prisma.invoice.create({
    data: { leaseId: leaseOnboarding.id, amount: 2500, dueDate: new Date(), status: "UNPAID", invoiceType: "DEPOSIT" }
  });

  // Lease B: Active Perfect Tenant (Deposit fully paid, balance holds deductions)
  const leaseActive = await prisma.lease.create({
    data: {
      unitId: u102.id, tenantId: tActive.id, status: "ACTIVE",
      startDate: dateBefore(2), endDate: dateAfter(10), monthlyRent: 3000, securityDeposit: 3500,
      depositPaidAt: dateBefore(2), depositPaidAmount: 3500, depositBalance: 3470, // Has one $30 deduction
      depositStatus: "HELD", signedAt: dateBefore(2)
    }
  });
  // Active invoices
  const inv1 = await prisma.invoice.create({ data: { leaseId: leaseActive.id, amount: 3500, dueDate: dateBefore(2), status: "PAID", paymentMethod: "STRIPE", grossPaid: 3601.50, invoiceType: "DEPOSIT" } });
  const inv2 = await prisma.invoice.create({ data: { leaseId: leaseActive.id, amount: 3000, dueDate: dateBefore(1), status: "PAID", paymentMethod: "STRIPE", grossPaid: 3087.00, invoiceType: "RENT" } });
  const inv3 = await prisma.invoice.create({ data: { leaseId: leaseActive.id, amount: 3000, dueDate: new Date(), status: "UNPAID", invoiceType: "RENT" } });

  const activeDepositTx = await prisma.transaction.create({
    data: { type: "INCOME", category: "DEPOSIT", amount: 3500, status: "COMPLETED", tenantId: tActive.id, invoiceId: inv1.id }
  });
  await prisma.lease.update({ where: { id: leaseActive.id }, data: { depositTransactionId: activeDepositTx.id } });
  await prisma.transaction.create({ data: { type: "INCOME", category: "RENT", amount: 3000, status: "COMPLETED", tenantId: tActive.id, invoiceId: inv2.id } });

  // Seed a refunded invoice to test profit charts and refund adjustments
  const invRefunded = await prisma.invoice.create({
    data: {
      leaseId: leaseActive.id,
      amount: 500,
      dueDate: dateBefore(3),
      status: "REFUNDED",
      paymentMethod: "STRIPE",
      invoiceType: "FEE",
      adminFee: 10,
      netToOwner: 490
    }
  });

  await prisma.transaction.create({
    data: {
      type: "EXPENSE",
      category: "OTHER",
      amount: 500,
      reference: "STRIPE_REFUND_seed123",
      tenantId: tActive.id,
      status: "COMPLETED",
      invoiceId: invRefunded.id
    }
  });

  // Lease C: Overdue tenant
  const leaseOverdue = await prisma.lease.create({
    data: {
      unitId: u104.id, tenantId: tOverdue.id, status: "ACTIVE",
      startDate: dateBefore(1), endDate: dateAfter(11), monthlyRent: 3200, securityDeposit: 3500,
      depositPaidAt: dateBefore(1), depositPaidAmount: 3500, depositBalance: 3500, depositStatus: "HELD"
    }
  });
  await prisma.invoice.create({ data: { leaseId: leaseOverdue.id, amount: 3200, dueDate: dateBefore(1), status: "OVERDUE", invoiceType: "RENT" } });

  // Lease D: Early termination / Moving out
  const leaseLeaving = await prisma.lease.create({
    data: {
      unitId: u103.id, tenantId: tLeaving.id, status: "ACTIVE",
      startDate: dateBefore(6), endDate: dateAfter(6), monthlyRent: 4500, securityDeposit: 5000,
      depositPaidAt: dateBefore(6), depositPaidAmount: 5000, depositBalance: 5000, depositStatus: "HELD",
      moveOutStatus: "MOVE_OUT_REQUESTED", moveOutRequestDate: new Date(), moveOutDate: dateAfter(0), moveOutReason: "Job transfer"
    }
  });

  // Lease E: Expired & Fully refunded with deductions
  const leaseExpired = await prisma.lease.create({
    data: {
      unitId: u105.id, tenantId: tExpired.id, status: "EXPIRED",
      startDate: dateBefore(14), endDate: dateBefore(2), monthlyRent: 2800, securityDeposit: 3000,
      depositPaidAt: dateBefore(14), depositPaidAmount: 3000, depositBalance: 0,
      depositStatus: "REFUNDED", refundMethod: "BANK_TRANSFER", refundRef: "REF-998877",
      moveOutStatus: "COMPLETED", moveOutDate: dateBefore(2),
      deductions: [
        { amount: 150.00, description: "Deep cleaning fee" },
        { amount: 200.00, description: "Patio screen replacement" }
      ]
    }
  });

  // Link a refund payout request
  await prisma.payoutRequest.create({
    data: {
      tenantId: tExpired.id, leaseId: leaseExpired.id, amount: 2650, status: PayoutStatus.COMPLETED,
      bankName: "Wells Fargo", accountNumber: encrypt("999988887777"), accountName: "Eve Expired", disbursedAt: dateBefore(2)
    }
  });

  // 6. Maintenance requests showcasing all flows and smart liability states
  console.log("Creating Maintenance Requests...");

  // Scenario 1: SUBMITTED
  await prisma.maintenanceRequest.create({
    data: {
      unitId: u101.id, tenantId: tOnboarding.id, title: "Smoke Detector Beeping",
      description: "Beeping every 10 mins. Low battery.", priority: "LOW", status: "SUBMITTED",
      category: "GENERAL", entryPermission: true
    }
  });

  // Scenario 2: ASSIGNED (Inspector set)
  await prisma.maintenanceRequest.create({
    data: {
      unitId: u102.id, tenantId: tActive.id, title: "HVAC Blowing Warm Air",
      description: "AC fails to blow cold air.", priority: "HIGH", status: "ASSIGNED",
      category: "APPLIANCE", inspectorId: inspector.id, scheduledDate: dateAfter(1),
      entryPermission: true
    }
  });

  // Scenario 3: DIAGNOSIS_SCHEDULED
  await prisma.maintenanceRequest.create({
    data: {
      unitId: u102.id, tenantId: tActive.id, title: "Dishwasher Leak",
      description: "Slow leak from underneath during cycle.", priority: "MEDIUM", status: "ASSIGNED",
      category: "APPLIANCE", inspectorId: inspector.id, diagnosisDate: dateBefore(1),
      entryPermission: true
    }
  });

  // Scenario 4: SUBMIT_ESTIMATE (Awaiting approval from owner)
  await prisma.maintenanceRequest.create({
    data: {
      unitId: u102.id, tenantId: tActive.id, title: "Frayed Carpeting",
      description: "Corner of carpet fraying.", priority: "LOW", status: "ASSIGNED",
      category: "GENERAL", inspectorId: inspector.id, estimatedLabor: 120.00, estimatedMaterials: 50.00
    }
  });

  // Scenario 5: AWAITING_APPROVAL (Over owner limit)
  await prisma.maintenanceRequest.create({
    data: {
      unitId: u103.id, tenantId: tLeaving.id, title: "Water Heater Failure",
      description: "No hot water in master bath.", priority: "HIGH", status: "AWAITING_APPROVAL",
      category: "PLUMBING", inspectorId: inspector.id, estimatedLabor: 800.00, estimatedMaterials: 450.00,
      inspectorNotes: "Requires tank replacement."
    }
  });

  // Scenario 6: REPAIR_SCHEDULED
  await prisma.maintenanceRequest.create({
    data: {
      unitId: u102.id, tenantId: tActive.id, title: "Garbage Disposal Jammed",
      description: "Humming sound but not spinning.", priority: "MEDIUM", status: "ASSIGNED",
      category: "APPLIANCE", inspectorId: inspector.id, repairDate: dateAfter(2),
      entryPermission: true
    }
  });

  // Scenario 7: IN_PROGRESS
  await prisma.maintenanceRequest.create({
    data: {
      unitId: u102.id, tenantId: tActive.id, title: "Clogged Main Line",
      description: "Toilet backing up.", priority: "HIGH", status: "ASSIGNED",
      category: "PLUMBING", inspectorId: inspector.id, scheduledDate: dateBefore(0)
    }
  });

  // Scenario 8: PENDING_TENANT_CONFIRMATION - STATE 1: Normal Wear & Tear (no charge)
  await prisma.maintenanceRequest.create({
    data: {
      unitId: u102.id, tenantId: tActive.id, title: "Worn Out Door Lock",
      description: "Deadbolt getting stuck.", priority: "MEDIUM", status: "PENDING_TENANT_CONFIRMATION",
      category: "GENERAL", finalLabor: 60.00, finalMaterials: 25.00,
      vendorReportedFault: false
    }
  });

  // Scenario 9: PENDING_TENANT_CONFIRMATION - STATE 2: Tenant Damage (Decision Needed)
  await prisma.maintenanceRequest.create({
    data: {
      unitId: u102.id, tenantId: tActive.id, title: "Broken Patio Glass",
      description: "Patio sliding glass shattered.", priority: "HIGH", status: "PENDING_TENANT_CONFIRMATION",
      category: "GENERAL", finalLabor: 250.00, finalMaterials: 300.00, // Total $550
      vendorReportedFault: true, ownerChargebackDecision: null // Undecided
    }
  });

  // Scenario 10: CLOSED - STATE 3A: Ruled Wear & Tear
  await prisma.maintenanceRequest.create({
    data: {
      unitId: u102.id, tenantId: tActive.id, title: "Microwave Sparking",
      description: "Microwave sparks during use.", priority: "MEDIUM", status: "CLOSED",
      category: "APPLIANCE", finalLabor: 80.00, finalMaterials: 10.00,
      vendorReportedFault: false, ownerChargebackDecision: "WEAR_AND_TEAR"
    }
  });

  // Scenario 11: CLOSED - STATE 3B: Ruled Tenant Fault, Fully Covered by Deposit
  const ticketDeduct = await prisma.maintenanceRequest.create({
    data: {
      unitId: u102.id, tenantId: tActive.id, title: "Broken Kitchen Drawer",
      description: "Drawer track bent out of shape.", priority: "LOW", status: "CLOSED",
      category: "GENERAL", finalLabor: 30.00, finalMaterials: 0.00,
      vendorReportedFault: true, ownerChargebackDecision: "TENANT_FAULT",
      chargebackSource: "DEPOSIT", chargebackDepositAmount: 30.00, chargebackInvoiceAmount: 0.00
    }
  });
  // Record transaction for this deduction
  await prisma.transaction.create({
    data: {
      type: "EXPENSE", category: "DEPOSIT", amount: 30.00,
      reference: `DEPOSIT_DEDUCT_${ticketDeduct.id.slice(-6)}`, status: "COMPLETED",
      tenantId: tActive.id
    }
  });

  // Scenario 12: CLOSED - STATE 3C: Ruled Tenant Fault, Split (Deposit exhausted + remaining invoiced)
  await prisma.maintenanceRequest.create({
    data: {
      unitId: u102.id, tenantId: tActive.id, title: "Flooring Water Damage",
      description: "Water left sitting on hardwood.", priority: "HIGH", status: "CLOSED",
      category: "GENERAL", finalLabor: 500.00, finalMaterials: 800.00, // $1300
      vendorReportedFault: true, ownerChargebackDecision: "TENANT_FAULT",
      chargebackSource: "SPLIT", chargebackDepositAmount: 1000.00, chargebackInvoiceAmount: 300.00,
      chargebackInvoiceId: "inv-split-shortfall"
    }
  });

  // Scenario 13: CLOSED - STATE 3D: Ruled Tenant Fault, Invoice-Only (No deposit balance)
  await prisma.maintenanceRequest.create({
    data: {
      unitId: u102.id, tenantId: tActive.id, title: "Dog Scratched Walls",
      description: "Dog scratched deep grooves into drywall.", priority: "MEDIUM", status: "CLOSED",
      category: "GENERAL", finalLabor: 150.00, finalMaterials: 20.00,
      vendorReportedFault: true, ownerChargebackDecision: "TENANT_FAULT",
      chargebackSource: "INVOICE", chargebackDepositAmount: 0.00, chargebackInvoiceAmount: 170.00,
      chargebackInvoiceId: "inv-scratch-full"
    }
  });

  // Scenario 14: Dispatched to external vendor
  await prisma.maintenanceRequest.create({
    data: {
      unitId: u102.id, tenantId: tActive.id, title: "HVAC Thermostat Replacement",
      description: "Thermostat display is dead.", priority: "MEDIUM", status: "ASSIGNED",
      category: "APPLIANCE", externalVendorId: vendorSpark.id, scheduledDate: dateAfter(3),
      vendorMagicToken: crypto.randomBytes(16).toString("hex")
    }
  });

  // Scenario 15: Reschedule requested
  await prisma.maintenanceRequest.create({
    data: {
      unitId: u102.id, tenantId: tActive.id, title: "Dryer vent cleaning",
      description: "Dryer taking multiple cycles.", priority: "LOW", status: "ASSIGNED",
      category: "APPLIANCE", inspectorId: inspector.id, scheduledDate: dateBefore(1),
      rescheduleRequested: true, rescheduleReason: "Conflicting doctor appointment"
    }
  });

  // 7. General Transactions & Payouts
  console.log("Creating General Ledger Transactions...");
  await prisma.transaction.create({ data: { type: "EXPENSE", category: "MAINTENANCE", amount: 150.00, reference: "Plumbing repair at Grand Horizon Unit 102", status: "COMPLETED" } });
  await prisma.transaction.create({ data: { type: "EXPENSE", category: "OTHER", amount: 79.00, reference: "Stripe monthly subscription fee", status: "COMPLETED" } });

  await prisma.payoutRequest.create({
    data: { ownerId: owner.id, amount: 8000, status: PayoutStatus.PENDING, bankName: "Chase Bank", accountNumber: encrypt("111122223333"), accountName: "Premium Props LLC" }
  });
  await prisma.payoutRequest.create({
    data: { ownerId: owner.id, amount: 12000, status: PayoutStatus.COMPLETED, bankName: "Chase Bank", accountNumber: encrypt("111122223333"), accountName: "Premium Props LLC", disbursedAt: dateBefore(4), proofUrl: "https://example.com/receipt.pdf" }
  });

  // 8. Documents
  console.log("Creating Documents...");
  await prisma.document.create({ data: { name: "Lease_Unit_102.pdf", url: "https://example.com/dummy.pdf", category: "LEASE", type: "Lease", description: "Signed residential lease", fileSize: "1.2 MB", tenantId: tActive.id, propertyId: propA.id } });
  await prisma.document.create({ data: { name: "ID_Olivia.jpg", url: "https://example.com/id.jpg", category: "IDENTIFICATION", type: "Identification", fileSize: "320 KB", tenantId: tOnboarding.id, propertyId: propA.id } });

  // 9. Messages
  console.log("Creating Messages...");
  const conversationId = [tActive.id, owner.id].sort().join("_");
  await prisma.message.create({ data: { senderId: tActive.id, receiverId: owner.id, content: "Just submitted the HVAC issue. Thanks!", conversationId } });
  await prisma.message.create({ data: { senderId: owner.id, receiverId: tActive.id, content: "Sure, Mike is assigned and will be there tomorrow.", isRead: true, conversationId } });

  // 10. Notifications
  console.log("Creating Notifications...");
  await prisma.notification.create({ data: { userId: owner.id, title: "New Application", message: "Andy has applied for Unit 101", type: "LEASE" } });
  await prisma.notification.create({ data: { userId: tActive.id, title: "Rent Paid", message: "May rent payment of $3,000 received", type: "BILLING", isRead: true, relatedEntityId: leaseActive.id } });
  await prisma.notification.create({ data: { userId: tActive.id, title: "Chargeback Issued", message: "A security deposit deduction of $30.00 was recorded.", type: "BILLING", relatedEntityId: leaseActive.id } });

  console.log("==========================================");
  console.log("✅ COMPACT COMPREHENSIVE SEED COMPLETE!");
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
