// Comprehensive, Production-Grade Database Seeding Script
// Generates realistic data to showcase EVERY feature of PropertyPro
import "dotenv/config";
import { PrismaClient, Role, PayoutStatus, TourType, TourStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Wiping existing database entries...");

  // Cascade delete in reverse dependency order
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
  await prisma.user.deleteMany();
  await prisma.pricingTier.deleteMany();
  await prisma.platformSettings.deleteMany();

  console.log("Generating secure passwords...");
  const passwordHash = await bcrypt.hash("password123", 10);

  // ==========================================
  // 1. PLATFORM SETTINGS & PRICING TIERS
  // ==========================================
  console.log("Creating Platform Settings & Pricing Tiers...");

  await prisma.platformSettings.create({
    data: {
      adminFeePercent: 2.00,
    }
  });

  const hobbyistTier = await prisma.pricingTier.create({
    data: {
      name: "Hobbyist",
      description: "Perfect for starting landlords",
      price: 0,
      minUnits: 1,
      maxUnits: 2,
      features: ["Up to 2 Units", "Basic Tenant Portal", "Manual Invoicing", "Email Support"],
      isActive: true,
      isCustom: false,
    }
  });

  const starterTier = await prisma.pricingTier.create({
    data: {
      name: "Starter",
      description: "For independent landlords with a few properties",
      price: 29,
      minUnits: 3,
      maxUnits: 15,
      features: ["Up to 15 Units", "Automated Rent Collection", "Maintenance Ticketing", "Basic Leases"],
      isActive: true,
      isCustom: false,
    }
  });

  const proTier = await prisma.pricingTier.create({
    data: {
      name: "Professional",
      description: "Everything you need for a growing PM company",
      price: 79,
      minUnits: 16,
      maxUnits: 50,
      features: ["Up to 50 Units", "Automated Rent Collection", "Maintenance Ticketing", "Custom Leases", "Priority Support"],
      isActive: true,
      isCustom: false,
    }
  });

  const enterpriseTier = await prisma.pricingTier.create({
    data: {
      name: "Enterprise",
      description: "Advanced controls for large portfolios and syndicates",
      price: 149,
      minUnits: 51,
      maxUnits: 9999,
      features: ["Unlimited Units", "Custom API Access", "Multi-Admin Roles", "Dedicated Success Manager"],
      isActive: true,
      isCustom: true,
    }
  });

  // ==========================================
  // 2. CORE PLATFORM USERS
  // ==========================================
  console.log("Creating Users (All Roles)...");
  
  const admin = await prisma.user.create({
    data: { email: "admin@example.com", name: "Super Admin", password: passwordHash, role: Role.SUPERADMIN },
  });

  const owner = await prisma.user.create({
    data: { 
      email: "owner@example.com", name: "Premium Properties LLC", password: passwordHash, role: Role.OWNER,
      bankName: "Chase Bank", accountNumber: "111122223333", accountName: "Premium Props", balance: 12560.50,
      currentTierId: proTier.id, subscriptionStatus: "Active", accountStatus: "ACTIVE",
      employmentStatus: "BUSINESS", employer: "Premium Properties LLC", position: "12-3456789",
      creditScore: 780, hasCompletedOnboarding: true, onboardingStep: 4
    },
  });

  const owner2 = await prisma.user.create({
    data: { 
      email: "owner2@example.com", name: "Secondary Owner LLC", password: passwordHash, role: Role.OWNER,
      bankName: "Wells Fargo", accountNumber: "444455556666", accountName: "Secondary Props", balance: 3450.00,
      currentTierId: starterTier.id, subscriptionStatus: "Active", accountStatus: "ACTIVE",
      employmentStatus: "INDIVIDUAL", position: "111-22-3333",
      creditScore: 710, hasCompletedOnboarding: true, onboardingStep: 4
    },
  });

  const owner3 = await prisma.user.create({
    data: { 
      email: "pastdue@example.com", name: "Grace Period LLC", password: passwordHash, role: Role.OWNER,
      currentTierId: starterTier.id, subscriptionStatus: "Past_Due", accountStatus: "ACTIVE",
      employmentStatus: "BUSINESS", hasCompletedOnboarding: true, onboardingStep: 4
    },
  });

  const owner4 = await prisma.user.create({
    data: { 
      email: "inactive@example.com", name: "Locked Out Properties", password: passwordHash, role: Role.OWNER,
      currentTierId: starterTier.id, subscriptionStatus: "Inactive", accountStatus: "ACTIVE",
      employmentStatus: "BUSINESS", hasCompletedOnboarding: false, onboardingStep: 1
    },
  });

  const inspector = await prisma.user.create({
    data: { email: "inspector@example.com", name: "Mike The Inspector", password: passwordHash, role: Role.INSPECTOR, phone: "+1 555-111-2222" },
  });

  const accountant = await prisma.user.create({
    data: { email: "accountant@example.com", name: "Sarah Accountant", password: passwordHash, role: Role.ACCOUNTANT },
  });

  // Tenants covering all use-cases
  const tenantApplicant = await prisma.user.create({ 
    data: { 
      email: "applicant@example.com", name: "Applicant Andy", password: passwordHash, role: Role.TENANT, 
      tenantStatus: "Applicant", phone: "555-999-0000", creditScore: 720, annualIncome: 90000 
    }
  });

  const tenantOnboarding = await prisma.user.create({ 
    data: { 
      email: "newtenant@example.com", name: "Onboarding Olivia", password: passwordHash, role: Role.TENANT, 
      tenantStatus: "Pending Onboarding", employmentStatus: "STUDENT", employer: "UCLA", position: "Scholarship", 
      dob: "2002-05-14", emergencyName: "Olivia's Mom", emergencyRelationship: "Mother", emergencyPhone: "555-000-1111", 
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop", creditScore: 680, annualIncome: 24000 
    }
  });

  const tenantActive = await prisma.user.create({ 
    data: { 
      email: "activetenant@example.com", name: "Active Adam", password: passwordHash, role: Role.TENANT, 
      tenantStatus: "Active", employmentStatus: "EMPLOYED", employer: "TechNova Inc", position: "Software Engineer", 
      dob: "1990-11-22", emergencyName: "Eve Adam", emergencyRelationship: "Spouse", emergencyPhone: "555-000-2222", 
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop", creditScore: 750, annualIncome: 110000 
    }
  });

  const tenantEarlyTerm = await prisma.user.create({ 
    data: { 
      email: "leavingtenant@example.com", name: "Leaving Liam", password: passwordHash, role: Role.TENANT, 
      tenantStatus: "Active", employmentStatus: "UNEMPLOYED", employer: "Savings", dob: "1985-08-30", 
      emergencyName: "Liam's Dad", emergencyRelationship: "Father", emergencyPhone: "555-000-3333", 
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop", creditScore: 640, annualIncome: 55000 
    }
  });

  const tenantExpired = await prisma.user.create({ 
    data: { 
      email: "expired@example.com", name: "Expired Eve", password: passwordHash, role: Role.TENANT, 
      tenantStatus: "Inactive", employmentStatus: "SELF_EMPLOYED", employer: "Eve's Bakery", position: "Owner", 
      dob: "1992-02-15", emergencyName: "Adam Eve", emergencyRelationship: "Husband", emergencyPhone: "555-000-4444", 
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop", creditScore: 790, annualIncome: 85000 
    }
  });

  // ==========================================
  // 2.5 OWNER APPLICATIONS
  // ==========================================
  console.log("Creating Owner Applications...");
  
  await prisma.ownerApplication.create({
    data: {
      name: "Pending Applicant LLC", email: "pending_owner@example.com", phone: "555-123-4567",
      entityType: "Property Management", portfolioSize: "1-5 Properties", status: "PENDING",
      trackingId: "trk_pending123", website: "https://pendingapp.com"
    }
  });

  await prisma.ownerApplication.create({
    data: {
      name: "Review Corp", email: "review_owner@example.com", phone: "555-987-6543",
      entityType: "Real Estate Investor", portfolioSize: "50+ Properties", status: "UNDER_REVIEW",
      trackingId: "trk_review456", website: "https://reviewcorp.com"
    }
  });

  await prisma.ownerApplication.create({
    data: {
      name: "Rejected Solo", email: "rejected@example.com", phone: "555-000-0000",
      entityType: "Independent Landlord", portfolioSize: "1-5 Properties", status: "REJECTED",
      rejectionReason: "Incomplete KYC details provided.", trackingId: "trk_reject789",
    }
  });

  // ==========================================
  // 3. PROPERTIES & UNITS
  // ==========================================
  console.log("Creating Properties and Units...");
  
  const propertyActive = await prisma.property.create({
    data: {
      name: "Grand Horizon Towers", address: "100 Grand Ave", city: "Los Angeles", state: "CA", zip: "90015", country: "USA",
      ownerId: owner.id, approvalStatus: "APPROVED", type: "Apartment",
      amenities: ["Swimming pool", "Fitness Center", "In-unit laundry", "Parking", "Balcony / Terrace"],
      coverPhoto: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800",
      images: [
        "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800#category=EXTERIOR",
        "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=800#category=AMENITIES"
      ],
      units: {
        create: [
          { 
            name: "101", type: "Apartment", rentAmount: 2000, depositAmt: 2500, rooms: 1, sqFootage: 800, maxOccupants: 2, status: "VACANT",
            images: ["https://images.unsplash.com/photo-1502672260266-1c1de24244fe?w=800#category=UNIT_INTERIOR"]
          },
          { name: "102", type: "Apartment", rentAmount: 3000, depositAmt: 3500, rooms: 2, sqFootage: 1200, maxOccupants: 4, status: "VACANT" },
          { name: "103", type: "Apartment", rentAmount: 4500, depositAmt: 5000, rooms: 3, sqFootage: 1800, maxOccupants: 5, status: "OCCUPIED" },
          { name: "104", type: "Penthouse", rentAmount: 8000, depositAmt: 10000, rooms: 4, sqFootage: 3000, maxOccupants: 8, status: "VACANT" },
        ]
      }
    },
    include: { units: true }
  });

  const propertyHouse = await prisma.property.create({
    data: {
      name: "Sunset Villa", address: "400 Sunset Blvd", city: "Los Angeles", state: "CA", zip: "90028", country: "USA",
      ownerId: owner.id, approvalStatus: "APPROVED", type: "House",
      amenities: ["Private backyard", "Garage", "Central heating", "Pet-friendly"],
      coverPhoto: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
      images: [
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800#category=EXTERIOR"
      ],
      units: {
        create: [
          { 
            name: "Main House", type: "House", rentAmount: 5500, depositAmt: 5500, rooms: 4, sqFootage: 2800, maxOccupants: 6, status: "VACANT",
            images: [
              "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800#category=UNIT_INTERIOR",
              "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800#category=UNIT_INTERIOR"
            ]
          }
        ]
      }
    },
    include: { units: true }
  });

  const propertyCommercial = await prisma.property.create({
    data: {
      name: "Downtown Tech Plaza", address: "888 Silicon Way", city: "Los Angeles", state: "CA", zip: "90012", country: "USA",
      ownerId: owner.id, approvalStatus: "APPROVED", type: "Commercial",
      zoningType: "Mixed-Use", parkingSpaces: 150,
      amenities: ["High-Speed Fiber", "Loading Dock", "Customer Parking", "Security System"],
      coverPhoto: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800",
      images: [
        "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800#category=FACADE",
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800#category=FACADE"
      ],
      units: {
        create: [
          { 
            name: "Suite 100", type: "Retail", rentAmount: 8500, depositAmt: 8500, rooms: 0, sqFootage: 4500, maxOccupants: 0, status: "VACANT",
            leaseStructure: "NNN", camCharges: 400,
            images: [
              "https://images.unsplash.com/photo-1556912173-3bb406ef7e77?w=800#category=UNIT_INTERIOR",
              "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800#category=UNIT_INTERIOR"
            ]
          },
          { 
            name: "Suite 200", type: "Office", rentAmount: 4200, depositAmt: 4200, rooms: 0, sqFootage: 2100, maxOccupants: 0, status: "VACANT",
            leaseStructure: "Gross",
            images: [
              "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800#category=UNIT_INTERIOR",
              "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800#category=UNIT_INTERIOR"
            ]
          }
        ]
      }
    },
    include: { units: true }
  });

  const propertyPending = await prisma.property.create({
    data: {
      name: "Pending luxury Villa", address: "500 Ocean Dr", city: "Miami", state: "FL", zip: "33139", country: "USA",
      ownerId: owner2.id, approvalStatus: "PENDING", type: "House",
      amenities: ["Private Beach Access", "Infinity Pool"],
      coverPhoto: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800",
      units: {
        create: [
          { name: "Villa A", type: "House", rentAmount: 12000, depositAmt: 20000, rooms: 6, sqFootage: 5500, maxOccupants: 10, status: "VACANT" }
        ]
      }
    },
    include: { units: true }
  });

  // ==========================================
  // 3. LEAD GEN: TOURS & APPLICATIONS
  // ==========================================
  console.log("Creating Tours and Applications...");
  
  await prisma.tour.create({
    data: {
      propertyId: propertyActive.id, unitId: propertyActive.units[0].id,
      tenantName: "Applicant Andy", tenantEmail: "applicant@example.com", tenantPhone: "555-999-0000",
      scheduledAt: new Date(), status: TourStatus.COMPLETED, tourType: TourType.IN_PERSON,
      feedbackRating: 5, feedbackComments: "The unit is amazing and very bright! Can't wait to apply."
    }
  });

  await prisma.tour.create({
    data: {
      propertyId: propertyActive.id, unitId: propertyActive.units[3].id,
      tenantName: "Interested Ian", tenantEmail: "ian@example.com", tenantPhone: "555-444-3322",
      scheduledAt: new Date(new Date().setDate(new Date().getDate() + 3)), status: TourStatus.CONFIRMED, tourType: TourType.VIDEO_CALL
    }
  });

  await prisma.tour.create({
    data: {
      propertyId: propertyHouse.id, unitId: propertyHouse.units[0].id,
      tenantName: "Sarah Connor", tenantEmail: "sarah@example.com", tenantPhone: "555-111-2222",
      scheduledAt: new Date(new Date().setDate(new Date().getDate() - 5)), status: TourStatus.CANCELLED, tourType: TourType.SELF_GUIDED,
      feedbackComments: "Cancelled due to scheduling conflict."
    }
  });

  await prisma.application.create({
    data: {
      unitId: propertyActive.units[0].id,
      name: "Applicant Andy", email: "applicant@example.com", phone: "555-999-0000",
      status: "APPROVED", monthlyIncome: 7500,
      employerName: "Acme Corp", jobTitle: "Software Engineer",
      occupantsCount: 1, moveInDate: new Date(new Date().setDate(new Date().getDate() + 15)), leaseDuration: 12,
      prevLandlordName: "Old Landlord Steve", prevLandlordPhone: "555-333-2222", reasonForMoving: "Closer to work",
      petsCount: 1, petDetails: "1 Small Corgi named Waffles", vehicleInfo: "Blue Tesla Model 3"
    }
  });

  await prisma.application.create({
    data: {
      unitId: propertyActive.units[0].id,
      name: "Student Sam", email: "sam@example.com", phone: "555-999-0001",
      status: "PENDING", monthlyIncome: 2000,
      employerName: "Student (Source: Parents/Financial Aid)", jobTitle: "STUDENT",
      occupantsCount: 2, moveInDate: new Date(new Date().setDate(new Date().getDate() + 30)), leaseDuration: 12
    }
  });

  await prisma.application.create({
    data: {
      unitId: propertyHouse.units[0].id,
      name: "Rejected Ron", email: "ron@example.com", phone: "555-888-7777",
      status: "REJECTED", monthlyIncome: 3000,
      employerName: "Freelance Designer", jobTitle: "Contractor",
      occupantsCount: 4, moveInDate: new Date(), leaseDuration: 6,
      reasonForMoving: "Evicted from past place"
    }
  });

  // ==========================================
  // 3.5 TENANT INVITATIONS
  // ==========================================
  console.log("Creating Tenant Invitations...");

  await prisma.tenantInvitation.create({
    data: {
      tenantEmail: "invited_tenant@example.com",
      tenantName: "Invited Tenant",
      unitId: propertyActive.units[0].id,
      propertyId: propertyActive.id,
      monthlyRent: propertyActive.units[0].rentAmount,
      leaseStartDate: new Date(new Date().setDate(new Date().getDate() + 5)),
      status: "PENDING",
      invitedByOwnerId: owner.id,
      expiresAt: new Date(new Date().setDate(new Date().getDate() + 7)),
    }
  });

  await prisma.tenantInvitation.create({
    data: {
      tenantEmail: "accepted_tenant@example.com",
      tenantName: "Accepted Tenant",
      unitId: propertyActive.units[1].id,
      propertyId: propertyActive.id,
      monthlyRent: propertyActive.units[1].rentAmount,
      leaseStartDate: new Date(),
      status: "ACCEPTED",
      invitedByOwnerId: owner.id,
      acceptedByTenantId: tenantActive.id,
      expiresAt: new Date(new Date().setDate(new Date().getDate() + 7)),
    }
  });

  // ==========================================
  // 4. LEASE LIFECYCLE (THE CORE ENGINE)
  // ==========================================
  console.log("Creating Leases (Various States)...");

  // A. Onboarding Lease (Pending Signature & Deposit)
  const leaseOnboarding = await prisma.lease.create({
    data: {
      unitId: propertyActive.units[0].id, tenantId: tenantOnboarding.id, status: "PENDING_SIGNATURE",
      startDate: new Date(), endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      monthlyRent: 2000, securityDeposit: 2500, earlyTerminationFee: 2000, isProratedRefundAllowed: false,
      customTerms: "1. No loud music after 10 PM.\n2. Tenant is responsible for basic bulb replacement."
    }
  });
  const invOnboarding = await prisma.invoice.create({
    data: { leaseId: leaseOnboarding.id, amount: 2500, dueDate: new Date(), status: "UNPAID" }
  });

  // B. Active Lease (Perfect Tenant)
  const leaseActive = await prisma.lease.create({
    data: {
      unitId: propertyActive.units[1].id, tenantId: tenantActive.id, status: "ACTIVE",
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 2)), 
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 10)),
      monthlyRent: 3000, securityDeposit: 3500,
      signedAt: new Date(new Date().setMonth(new Date().getMonth() - 2)),
      signatureImageUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='50'><path d='M10 30 Q30 15 50 30 T90 30' fill='none' stroke='black' stroke-width='2'/></svg>"
    }
  });
  const inv1 = await prisma.invoice.create({ data: { leaseId: leaseActive.id, amount: 3500, dueDate: new Date(new Date().setMonth(new Date().getMonth() - 2)), status: "PAID", paymentMethod: "STRIPE", processingFee: 101.50, adminFee: 70.00, netToOwner: 3430.00, grossPaid: 3601.50 }});
  const inv2 = await prisma.invoice.create({ data: { leaseId: leaseActive.id, amount: 3000, dueDate: new Date(new Date().setMonth(new Date().getMonth() - 1)), status: "PAID", paymentMethod: "STRIPE", processingFee: 87.00, adminFee: 60.00, netToOwner: 2940.00, grossPaid: 3087.00 }});
  const inv3 = await prisma.invoice.create({ data: { leaseId: leaseActive.id, amount: 3000, dueDate: new Date(), status: "UNPAID" }});
  
  await prisma.transaction.create({ data: { type: "INCOME", category: "DEPOSIT", amount: 3430, status: "COMPLETED", tenantId: tenantActive.id, invoiceId: inv1.id }});
  await prisma.transaction.create({ data: { type: "INCOME", category: "RENT", amount: 2940, status: "COMPLETED", tenantId: tenantActive.id, invoiceId: inv2.id }});

  // B2. Commercial Lease (Suite 200)
  const commUnits = await prisma.unit.findMany({ where: { propertyId: propertyCommercial.id }, orderBy: { name: 'asc' } });
  const commercialLease = await prisma.lease.create({
    data: {
      unitId: commUnits[1].id, tenantId: tenantActive.id, status: "ACTIVE",
      startDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1)), 
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 4)),
      monthlyRent: 4200, securityDeposit: 8400,
    }
  });
  const commInv = await prisma.invoice.create({ data: { leaseId: commercialLease.id, amount: 8400, dueDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1)), status: "PAID", paymentMethod: "BANK_TRANSFER", processingFee: 243.90, adminFee: 168.00, netToOwner: 8232.00, grossPaid: 8643.90 }});
  await prisma.transaction.create({ data: { type: "INCOME", category: "DEPOSIT", amount: 8232, status: "COMPLETED", tenantId: tenantActive.id, invoiceId: commInv.id }});

  // C. Early Termination Request
  const leaseEarly = await prisma.lease.create({
    data: {
      unitId: propertyActive.units[2].id, tenantId: tenantEarlyTerm.id, status: "ACTIVE",
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 6)),
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 6)),
      monthlyRent: 4500, securityDeposit: 5000, earlyTerminationFee: 4500, isProratedRefundAllowed: true,
      moveOutStatus: "MOVE_OUT_REQUESTED", moveOutRequestDate: new Date(), moveOutDate: new Date(new Date().setDate(new Date().getDate() + 10)), moveOutReason: "Job relocation",
    }
  });
  const earlyInv1 = await prisma.invoice.create({ data: { leaseId: leaseEarly.id, amount: 4500, dueDate: new Date(new Date().setDate(1)), status: "PAID", paymentMethod: "STRIPE", processingFee: 130.80, adminFee: 90.00, netToOwner: 4410.00, grossPaid: 4630.80 }});
  const earlyInv2 = await prisma.invoice.create({ data: { leaseId: leaseEarly.id, amount: 5000, dueDate: new Date(new Date().setMonth(new Date().getMonth() - 6)), status: "PAID", paymentMethod: "STRIPE", processingFee: 145.30, adminFee: 100.00, netToOwner: 4900.00, grossPaid: 5145.30 }}); // Paid deposit
  
  await prisma.transaction.create({ data: { type: "INCOME", category: "RENT", amount: 4410, status: "COMPLETED", tenantId: tenantEarlyTerm.id, invoiceId: earlyInv1.id }});
  await prisma.transaction.create({ data: { type: "INCOME", category: "DEPOSIT", amount: 4900, status: "COMPLETED", tenantId: tenantEarlyTerm.id, invoiceId: earlyInv2.id }});

  // D. Expired Lease
  const leaseExpired = await prisma.lease.create({
    data: {
      unitId: propertyActive.units[3].id, tenantId: tenantExpired.id, status: "EXPIRED",
      startDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
      endDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      monthlyRent: 2500, securityDeposit: 2500,
      depositStatus: "REFUNDED", refundMethod: "BANK_TRANSFER", refundRef: "REF-998877",
      moveOutStatus: "COMPLETED", moveOutDate: new Date(new Date().setMonth(new Date().getMonth() - 1))
    }
  });

  // ==========================================
  // 5. MAINTENANCE & COMMUNICATIONS
  // ==========================================
  console.log("Creating Maintenance & Messages...");

  const crypto = require("crypto");
  
  // 1. SUBMITTED: Fresh request, waiting for owner assignment
  await prisma.maintenanceRequest.create({
    data: {
      unitId: propertyActive.units[0].id, tenantId: tenantOnboarding.id,
      title: "Smoke Detector Beeping", description: "Low battery beep keeps happening every 5 minutes.", priority: "LOW", status: "SUBMITTED",
      category: "GENERAL", entryPermission: true, vendorMagicToken: crypto.randomBytes(16).toString("hex")
    }
  });

  // 2. ASSIGNED: Assigned to a vendor, vendor hasn't estimated yet
  const maintenanceHVAC = await prisma.maintenanceRequest.create({
    data: {
      unitId: propertyActive.units[1].id, tenantId: tenantActive.id,
      title: "HVAC Not Cooling", description: "The AC is blowing warm air.", priority: "HIGH", status: "ASSIGNED",
      category: "APPLIANCE", inspectorId: inspector.id, scheduledDate: new Date(new Date().setDate(new Date().getDate() + 1)),
      entryPermission: true, preferredTimes: "Mornings before 12 PM",
      vendorMagicToken: crypto.randomBytes(16).toString("hex")
    }
  });

  // 3. AWAITING_APPROVAL: Vendor submitted estimate > approvalThreshold
  await prisma.maintenanceRequest.create({
    data: {
      unitId: propertyActive.units[2].id, tenantId: tenantEarlyTerm.id,
      title: "Burst Pipe in Bathroom", description: "Water leaking heavily from under the sink.", priority: "EMERGENCY", status: "AWAITING_APPROVAL",
      category: "PLUMBING", inspectorId: inspector.id,
      estimatedLabor: 1200.00, estimatedMaterials: 400.00, // Total $1600 > $1500 emergency override
      vendorMagicToken: crypto.randomBytes(16).toString("hex"),
      inspectorNotes: "Pipe burst behind the wall, needs extensive cutting and repair."
    }
  });

  // 4. PENDING_TENANT_CONFIRMATION: Work completed, waiting for tenant to say "Yes it's fixed"
  await prisma.maintenanceRequest.create({
    data: {
      unitId: propertyActive.units[1].id, tenantId: tenantActive.id,
      title: "Broken Window Blinds", description: "The blinds in the living room are snapped.", priority: "LOW", status: "PENDING_TENANT_CONFIRMATION",
      category: "GENERAL", inspectorId: inspector.id,
      finalLabor: 50.00, finalMaterials: 35.00,
      inspectorNotes: "Replaced the blinds entirely.",
      vendorMagicToken: crypto.randomBytes(16).toString("hex")
    }
  });

  // 5. CLOSED (with chargeback): Tenant caused damage, owner approved chargeback
  await prisma.maintenanceRequest.create({
    data: {
      unitId: propertyActive.units[1].id, tenantId: tenantActive.id,
      title: "Hole in Drywall", description: "Moving furniture caused a large hole.", priority: "MEDIUM", status: "CLOSED",
      category: "GENERAL", inspectorId: inspector.id,
      finalLabor: 150.00, finalMaterials: 45.00,
      inspectorNotes: "Patched, sanded, and painted the wall.",
      vendorReportedFault: true, ownerApprovedChargeback: true, // triggers chargeback logic
      tenantRating: 5, tenantFeedback: "Looks brand new, fair charge.",
      vendorMagicToken: crypto.randomBytes(16).toString("hex")
    }
  });

  // Communication Threads
  await prisma.message.create({
    data: {
      senderId: tenantActive.id, receiverId: owner.id,
      content: "Hi, I just submitted a maintenance request for the AC.",
    }
  });

  await prisma.message.create({
    data: {
      senderId: owner.id, receiverId: tenantActive.id,
      content: "Got it Adam, I've assigned Mike (our inspector) to take a look tomorrow morning.",
      isRead: true
    }
  });

  await prisma.message.create({
    data: {
      senderId: tenantActive.id, receiverId: owner.id,
      content: "Perfect, thank you! I will be home.",
      isRead: true
    }
  });

  await prisma.message.create({
    data: {
      senderId: owner.id, receiverId: inspector.id,
      content: "Hi Mike, please prioritize Adam's HVAC issue at Grand Horizon Towers Unit 102. Thanks!",
    }
  });

  // ==========================================
  // 5.5 DOCUMENTS
  // ==========================================
  console.log("Creating Documents...");

  await prisma.document.create({
    data: {
      name: "Lease_Agreement_Unit_102.pdf",
      url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      category: "LEASE",
      type: "Lease",
      description: "Fully signed residential lease agreement for Grand Horizon Towers Unit 102.",
      fileSize: "1.2 MB",
      tenantId: tenantActive.id,
      propertyId: propertyActive.id,
      tags: ["Lease", "Grand Horizon", "Active"]
    }
  });

  await prisma.document.create({
    data: {
      name: "Tenant_ID_Olivia.jpg",
      url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800",
      category: "IDENTIFICATION",
      type: "Identification",
      description: "Government-issued photo identification.",
      fileSize: "320 KB",
      tenantId: tenantOnboarding.id,
      propertyId: propertyActive.id,
      tags: ["ID", "Onboarding", "Verification"]
    }
  });

  await prisma.document.create({
    data: {
      name: "Rent_Receipt_May.pdf",
      url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      category: "PAYMENTS",
      type: "Receipt",
      description: "Rent invoice receipt for May 2026.",
      fileSize: "140 KB",
      tenantId: tenantActive.id,
      propertyId: propertyActive.id,
      tags: ["Receipt", "May", "Rent"]
    }
  });

  // ==========================================
  // 6. FINANCIALS & PAYOUTS (ACCOUNTING)
  // ==========================================
  console.log("Creating Transactions & Payouts...");

  await prisma.payoutRequest.create({
    data: {
      ownerId: owner.id, amount: 5000, status: PayoutStatus.PENDING, bankName: "Chase Bank", accountNumber: "111122223333", accountName: "Premium Props LLC",
    }
  });

  await prisma.payoutRequest.create({
    data: {
      ownerId: owner.id, amount: 10000, status: PayoutStatus.COMPLETED, bankName: "Chase Bank", accountNumber: "111122223333", accountName: "Premium Props LLC", disbursedAt: new Date(),
      proofUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
    }
  });

  await prisma.payoutRequest.create({
    data: {
      ownerId: owner2.id, amount: 1500, status: PayoutStatus.REJECTED, bankName: "Wells Fargo", accountNumber: "444455556666", accountName: "Secondary Props LLC",
      proofUrl: "Rejection: Bank routing code mismatches."
    }
  });

  // Some expenses (Maintenance, repairs)
  await prisma.transaction.create({
    data: {
      type: "EXPENSE", category: "MAINTENANCE", amount: 155.00, reference: `Plumbing repair at Sunset Villa`, status: "COMPLETED",
      feeDeducted: 0.00
    }
  });

  await prisma.transaction.create({
    data: {
      type: "EXPENSE", category: "OTHER", amount: 79.00, reference: "Stripe subscription fee (Professional Plan)", status: "COMPLETED"
    }
  });

  // ==========================================
  // 7. NOTIFICATIONS
  // ==========================================
  console.log("Creating Notifications...");
  
  // Owner Notifications
  await prisma.notification.create({ data: { userId: owner.id, title: "New Application Received", message: "Applicant Andy has submitted an application for Unit 101.", type: "LEASE", priority: "HIGH" }});
  await prisma.notification.create({ data: { userId: owner.id, title: "High Priority HVAC Ticket", message: "Active Adam submitted a maintenance request for HVAC repair.", type: "MAINTENANCE", priority: "HIGH" }});
  await prisma.notification.create({ data: { userId: owner.id, title: "Payout Confirmed", message: "Your requested payout of $10,000 has been completed and disbursed to Chase Bank.", type: "BILLING", priority: "MEDIUM" }});
  await prisma.notification.create({ data: { userId: owner.id, title: "Tour Completed", message: "Applicant Andy completed a tour at Grand Horizon Towers.", type: "SYSTEM", priority: "LOW" }});
  
  // Tenant Notifications
  await prisma.notification.create({ data: { userId: tenantOnboarding.id, title: "Action Required: Sign Lease", message: "Please sign your lease contract to finalize your onboarding flow.", type: "LEASE", priority: "HIGH", isRead: false }});
  await prisma.notification.create({ data: { userId: tenantActive.id, title: "Invoice Paid successfully", message: "Your May Rent payment of $3,000 was received.", type: "BILLING", priority: "MEDIUM", isRead: true }});
  await prisma.notification.create({ data: { userId: tenantActive.id, title: "Maintenance Status Update", message: "Your request 'HVAC Not Cooling' status has changed to ASSIGNED.", type: "MAINTENANCE", priority: "MEDIUM", isRead: false }});
  await prisma.notification.create({ data: { userId: tenantEarlyTerm.id, title: "Move-Out Notice Confirmed", message: "Your early move-out request has been logged. Move-out scheduled for next week.", type: "SYSTEM", priority: "MEDIUM" }});

  // Admin Notifications
  await prisma.notification.create({ data: { userId: admin.id, title: "Property Review Required", message: "Secondary Owner LLC added 'Pending luxury Villa' which requires admin approval.", type: "SYSTEM", priority: "HIGH" }});
  await prisma.notification.create({ data: { userId: admin.id, title: "Payout Request Pending Approval", message: "Premium Properties LLC requested a payout of $5,000.", type: "BILLING", priority: "HIGH" }});
  await prisma.notification.create({ data: { userId: admin.id, title: "Dispute Filed by Tenant", message: "Leaving Liam has disputed his move-out deductions.", type: "SYSTEM", priority: "HIGH" }});

  // Inspector Notifications
  await prisma.notification.create({ data: { userId: inspector.id, title: "New Maintenance Assignment", message: "You have been assigned to HVAC Repair at Grand Horizon Towers.", type: "MAINTENANCE", priority: "HIGH" }});
  await prisma.notification.create({ data: { userId: inspector.id, title: "Inspection Scheduled", message: "Move-out inspection scheduled for Leaving Liam in 5 days.", type: "MAINTENANCE", priority: "MEDIUM" }});

  console.log("==========================================");
  console.log("✅ MASSIVE PRODUCTION DATABASE SEED COMPLETE!");
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
