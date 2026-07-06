// Comprehensive, Production-Grade Database Seeding Script
// Generates realistic data to showcase EVERY feature of PropertyPro
import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
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
  await prisma.user.deleteMany();
  await prisma.pricingTier.deleteMany();

  console.log("Generating secure passwords...");
  const passwordHash = await bcrypt.hash("password123", 10);

  // ==========================================
  // 1. PRICING TIERS
  // ==========================================
  console.log("Creating Pricing Tiers...");
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
      bankName: "Chase Bank", accountNumber: "111122223333", accountName: "Premium Props", balance: 25000.00,
      currentTierId: proTier.id, subscriptionStatus: "Active", accountStatus: "ACTIVE",
      employmentStatus: "BUSINESS", employer: "Premium Properties LLC", position: "12-3456789" // Using existing DB fields for Entity Type, Business Name, Tax ID
    },
  });

  const owner2 = await prisma.user.create({
    data: { 
      email: "owner2@example.com", name: "Secondary Owner LLC", password: passwordHash, role: Role.OWNER,
      bankName: "Wells Fargo", accountNumber: "444455556666", accountName: "Secondary Props", balance: 10000.00,
      currentTierId: starterTier.id, subscriptionStatus: "Active", accountStatus: "ACTIVE",
      employmentStatus: "INDIVIDUAL", position: "111-22-3333" // SSN instead of EIN
    },
  });

  const owner3 = await prisma.user.create({
    data: { 
      email: "pastdue@example.com", name: "Grace Period LLC", password: passwordHash, role: Role.OWNER,
      currentTierId: starterTier.id, subscriptionStatus: "Past_Due", accountStatus: "ACTIVE",
      employmentStatus: "BUSINESS"
    },
  });

  const owner4 = await prisma.user.create({
    data: { 
      email: "inactive@example.com", name: "Locked Out Properties", password: passwordHash, role: Role.OWNER,
      currentTierId: starterTier.id, subscriptionStatus: "Inactive", accountStatus: "ACTIVE",
      employmentStatus: "BUSINESS"
    },
  });

  const inspector = await prisma.user.create({
    data: { email: "inspector@example.com", name: "Mike The Inspector", password: passwordHash, role: Role.INSPECTOR, phone: "+1 555-111-2222" },
  });

  const accountant = await prisma.user.create({
    data: { email: "accountant@example.com", name: "Sarah Accountant", password: passwordHash, role: Role.ACCOUNTANT },
  });

  // Tenants covering all use-cases
  const tenantApplicant = await prisma.user.create({ data: { email: "applicant@example.com", name: "Applicant Andy", password: passwordHash, role: Role.TENANT, tenantStatus: "Applicant" }});
  const tenantOnboarding = await prisma.user.create({ data: { email: "newtenant@example.com", name: "Onboarding Olivia", password: passwordHash, role: Role.TENANT, employmentStatus: "STUDENT", employer: "UCLA", position: "Scholarship", dob: "2002-05-14", emergencyName: "Olivia's Mom", emergencyRelationship: "Mother", emergencyPhone: "555-000-1111", avatar: "https://i.pravatar.cc/150?img=47" }});
  const tenantActive = await prisma.user.create({ data: { email: "activetenant@example.com", name: "Active Adam", password: passwordHash, role: Role.TENANT, employmentStatus: "EMPLOYED", employer: "TechNova Inc", position: "Software Engineer", dob: "1990-11-22", emergencyName: "Eve Adam", emergencyRelationship: "Spouse", emergencyPhone: "555-000-2222", avatar: "https://i.pravatar.cc/150?img=11" }});
  const tenantEarlyTerm = await prisma.user.create({ data: { email: "leavingtenant@example.com", name: "Leaving Liam", password: passwordHash, role: Role.TENANT, employmentStatus: "UNEMPLOYED", employer: "Savings", dob: "1985-08-30", emergencyName: "Liam's Dad", emergencyRelationship: "Father", emergencyPhone: "555-000-3333", avatar: "https://i.pravatar.cc/150?img=12" }});
  const tenantExpired = await prisma.user.create({ data: { email: "expired@example.com", name: "Expired Eve", password: passwordHash, role: Role.TENANT, employmentStatus: "SELF_EMPLOYED", employer: "Eve's Bakery", position: "Owner", dob: "1992-02-15", emergencyName: "Adam Eve", emergencyRelationship: "Husband", emergencyPhone: "555-000-4444", avatar: "https://i.pravatar.cc/150?img=5" }});

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
          { name: "102", type: "Apartment", rentAmount: 3000, depositAmt: 3500, rooms: 2, sqFootage: 1200, maxOccupants: 4, status: "OCCUPIED" },
          { name: "103", type: "Apartment", rentAmount: 4500, depositAmt: 5000, rooms: 3, sqFootage: 1800, maxOccupants: 5, status: "OCCUPIED" },
          { name: "104", type: "Penthouse", rentAmount: 8000, depositAmt: 10000, rooms: 4, sqFootage: 3000, maxOccupants: 8, status: "MAINTENANCE" },
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
            // @ts-ignore: Prisma client needs regeneration
            leaseStructure: "NNN",
            images: [
              "https://images.unsplash.com/photo-1556912173-3bb406ef7e77?w=800#category=UNIT_INTERIOR",
              "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800#category=UNIT_INTERIOR"
            ]
          },
          { 
            name: "Suite 200", type: "Office", rentAmount: 4200, depositAmt: 4200, rooms: 0, sqFootage: 2100, maxOccupants: 0, status: "OCCUPIED",
            // @ts-ignore: Prisma client needs regeneration
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

  // ==========================================
  // 3. LEAD GEN: TOURS & APPLICATIONS
  // ==========================================
  console.log("Creating Tours and Applications...");
  
  await prisma.tour.create({
    data: {
      propertyId: propertyActive.id, unitId: propertyActive.units[0].id,
      tenantName: "Applicant Andy", tenantEmail: "applicant@example.com", tenantPhone: "555-999-0000",
      scheduledAt: new Date(), status: "COMPLETED",
    }
  });

  await prisma.application.create({
    data: {
      unitId: propertyActive.units[0].id,
      name: "Applicant Andy", email: "applicant@example.com", phone: "555-999-0000",
      status: "PENDING", monthlyIncome: 7500,
      employerName: "Acme Corp", jobTitle: "Software Engineer",
      occupantsCount: 1, moveInDate: new Date(new Date().setDate(new Date().getDate() + 15)), leaseDuration: 12
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
    }
  });
  await prisma.invoice.create({
    data: { leaseId: leaseOnboarding.id, amount: 2500, dueDate: new Date(), status: "UNPAID" }
  });

  // B. Active Lease (Perfect Tenant)
  const leaseActive = await prisma.lease.create({
    data: {
      unitId: propertyActive.units[1].id, tenantId: tenantActive.id, status: "ACTIVE",
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 2)), 
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 10)),
      monthlyRent: 3000, securityDeposit: 3500,
    }
  });
  await prisma.invoice.create({ data: { leaseId: leaseActive.id, amount: 3500, dueDate: new Date(new Date().setMonth(new Date().getMonth() - 2)), status: "PAID" }});
  await prisma.transaction.create({ data: { type: "INCOME", category: "DEPOSIT", amount: 3500, status: "COMPLETED", tenantId: tenantActive.id }});

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
  await prisma.invoice.create({ data: { leaseId: commercialLease.id, amount: 8400, dueDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1)), status: "PAID" }});

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
  await prisma.invoice.create({ data: { leaseId: leaseEarly.id, amount: 4500, dueDate: new Date(new Date().setDate(1)), status: "PAID" }});
  await prisma.invoice.create({ data: { leaseId: leaseEarly.id, amount: 5000, dueDate: new Date(new Date().setMonth(new Date().getMonth() - 6)), status: "PAID" }}); // Paid deposit

  // ==========================================
  // 5. MAINTENANCE & COMMUNICATIONS
  // ==========================================
  console.log("Creating Maintenance & Messages...");

  await prisma.maintenanceRequest.create({
    data: {
      unitId: propertyActive.units[1].id, tenantId: tenantActive.id,
      title: "HVAC Not Cooling", description: "The AC is blowing warm air.", priority: "HIGH", status: "IN_PROGRESS",
    }
  });

  await prisma.message.create({
    data: {
      senderId: tenantActive.id, receiverId: owner.id,
      content: "Hi, I just submitted a maintenance request for the AC.",
    }
  });

  // ==========================================
  // 6. FINANCIALS & PAYOUTS (ACCOUNTING)
  // ==========================================
  console.log("Creating Transactions & Payouts...");

  await prisma.payoutRequest.create({
    data: {
      ownerId: owner.id, amount: 5000, status: "PENDING", bankName: "Chase Bank", accountNumber: "111122223333", accountName: "John Landlord",
    }
  });

  await prisma.payoutRequest.create({
    data: {
      ownerId: owner.id, amount: 10000, status: "COMPLETED", bankName: "Chase Bank", accountNumber: "111122223333", accountName: "John Landlord", disbursedAt: new Date(),
    }
  });

  // ==========================================
  // 7. NOTIFICATIONS
  // ==========================================
  console.log("Creating Notifications...");
  
  // Owner Notifications
  await prisma.notification.create({ data: { userId: owner.id, title: "New Application", message: "Applicant Andy applied for Unit 101.", type: "LEASE", priority: "HIGH" }});
  await prisma.notification.create({ data: { userId: owner.id, title: "Maintenance Request", message: "Active Adam submitted a high-priority HVAC ticket.", type: "MAINTENANCE", priority: "HIGH" }});
  await prisma.notification.create({ data: { userId: owner.id, title: "Payout Disbursed", message: "Your recent payout of $10,000 has been transferred to your bank.", type: "BILLING", priority: "MEDIUM" }});
  
  // Tenant Notifications
  await prisma.notification.create({ data: { userId: tenantOnboarding.id, title: "Action Required", message: "Please sign your lease contract to continue onboarding.", type: "LEASE", priority: "HIGH", isRead: false }});
  await prisma.notification.create({ data: { userId: tenantActive.id, title: "Rent Invoice Generated", message: "Your upcoming rent invoice of $3,000 is due on the 1st.", type: "BILLING", priority: "MEDIUM" }});
  await prisma.notification.create({ data: { userId: tenantActive.id, title: "Maintenance Update", message: "Your ticket 'HVAC Not Cooling' is now IN PROGRESS.", type: "MAINTENANCE", priority: "MEDIUM", isRead: true }});
  await prisma.notification.create({ data: { userId: tenantEarlyTerm.id, title: "Move-Out Request", message: "Your move-out request has been submitted to the owner for review.", type: "SYSTEM", priority: "MEDIUM" }});

  // Admin Notifications
  await prisma.notification.create({ data: { userId: admin.id, title: "Property Approval Required", message: "Pending Villa by Premium Properties LLC requires your review.", type: "SYSTEM", priority: "HIGH" }});
  await prisma.notification.create({ data: { userId: admin.id, title: "Payout Request Pending", message: "Premium Properties LLC requested a payout of $5,000.", type: "BILLING", priority: "HIGH" }});
  await prisma.notification.create({ data: { userId: admin.id, title: "Mediation Needed", message: "Leaving Liam has disputed his move-out deductions.", type: "SYSTEM", priority: "HIGH" }});

  // Inspector Notifications
  await prisma.notification.create({ data: { userId: inspector.id, title: "New Ticket Assigned", message: "You have been assigned to 'HVAC Not Cooling' at Grand Horizon Towers Unit 102.", type: "MAINTENANCE", priority: "HIGH" }});
  await prisma.notification.create({ data: { userId: inspector.id, title: "Move-Out Inspection", message: "Move-out inspection scheduled for Leaving Liam on the 15th.", type: "MAINTENANCE", priority: "MEDIUM" }});
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
