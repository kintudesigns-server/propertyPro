import "dotenv/config";
import { PrismaClient, Role, PayoutStatus } from "@prisma/client";
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
  await prisma.application.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.property.deleteMany();
  await prisma.user.deleteMany();

  console.log("Generating secure passwords...");
  const passwordHash = await bcrypt.hash("password123", 10);
  const adminHash = await bcrypt.hash("admin1234", 10);

  // 1. Super Admin
  const admin = await prisma.user.create({
    data: {
      email: "admin@propertypro.app",
      name: "Platform Super Admin",
      password: adminHash,
      role: Role.SUPERADMIN,
    },
  });

  // 2. Owners (Landlords)
  const owner1 = await prisma.user.create({
    data: {
      email: "owner1@propertypro.app",
      name: "Owner One (Grand Horizon)",
      password: passwordHash,
      role: Role.OWNER,
      bankName: "Chase Bank",
      accountNumber: "111122223333",
      accountName: "Horizon Properties LLC",
      balance: 5400.00,
    },
  });

  const owner2 = await prisma.user.create({
    data: {
      email: "owner2@propertypro.app",
      name: "Owner Two (Canary Towers)",
      password: passwordHash,
      role: Role.OWNER,
      bankName: "HSBC UK",
      accountNumber: "444455556666",
      accountName: "Canary Holdings Ltd",
      balance: 3200.00,
    },
  });

  const owner3 = await prisma.user.create({
    data: {
      email: "owner3@propertypro.app",
      name: "Owner Three (Empty portfolio)",
      password: passwordHash,
      role: Role.OWNER,
      bankName: "Wells Fargo",
      accountNumber: "777788889999",
      accountName: "Owner Three Ventures",
      balance: 0.00,
    },
  });

  // 3. Inspector (Technician)
  const inspector = await prisma.user.create({
    data: {
      email: "inspector@propertypro.app",
      name: "Inspector Alex (Tech)",
      password: passwordHash,
      role: Role.INSPECTOR,
      phone: "+1 555 999 8888",
    },
  });

  // 4. Tenants
  const tenant1 = await prisma.user.create({
    data: {
      email: "tenant1@propertypro.app",
      name: "John Doe (Active Tenant)",
      password: passwordHash,
      role: Role.TENANT,
      phone: "+1 555 111 2222",
    },
  });

  const tenant2 = await prisma.user.create({
    data: {
      email: "tenant2@propertypro.app",
      name: "Jane Smith (Active Tenant 2)",
      password: passwordHash,
      role: Role.TENANT,
      phone: "+1 555 222 3333",
    },
  });

  const tenant3 = await prisma.user.create({
    data: {
      email: "tenant3@propertypro.app",
      name: "Alice Johnson (Expiring Lease)",
      password: passwordHash,
      role: Role.TENANT,
      phone: "+1 555 333 4444",
    },
  });

  const tenant4 = await prisma.user.create({
    data: {
      email: "tenant4@propertypro.app",
      name: "Bob Miller (Applicant)",
      password: passwordHash,
      role: Role.TENANT,
      phone: "+1 555 444 5555",
      tenantStatus: "Applicant",
    },
  });

  const tenant5 = await prisma.user.create({
    data: {
      email: "tenant5@propertypro.app",
      name: "Charlie Brown (Pending Review)",
      password: passwordHash,
      role: Role.TENANT,
      phone: "+1 555 555 6666",
      tenantStatus: "Pending Review",
    },
  });

  console.log("Seeding properties and units...");
  // 5. Properties
  const prop1 = await prisma.property.create({
    data: {
      name: "Grand Horizon Apartments",
      address: "123 Grand Ave",
      city: "New York",
      state: "NY",
      zip: "10001",
      country: "USA",
      coverPhoto: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800",
      ownerId: owner1.id,
      type: "Apartment",
    },
  });

  const prop2 = await prisma.property.create({
    data: {
      name: "Canary Wharf Towers",
      address: "45 Canary St",
      city: "London",
      state: "ENG",
      zip: "E14 5AB",
      country: "UK",
      coverPhoto: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
      ownerId: owner2.id,
      type: "Condo",
    },
  });

  // 6. Units
  const unit101 = await prisma.unit.create({
    data: {
      name: "Unit 101",
      propertyId: prop1.id,
      rentAmount: 1800.00,
      depositAmt: 1800.00,
      rooms: 2,
      sqFootage: 850,
      status: "OCCUPIED",
    },
  });

  const unit102 = await prisma.unit.create({
    data: {
      name: "Unit 102",
      propertyId: prop1.id,
      rentAmount: 1900.00,
      depositAmt: 1900.00,
      rooms: 2,
      sqFootage: 900,
      status: "OCCUPIED",
    },
  });

  const unit103 = await prisma.unit.create({
    data: {
      name: "Unit 103 (Vacant)",
      propertyId: prop1.id,
      rentAmount: 2000.00,
      depositAmt: 2000.00,
      rooms: 3,
      sqFootage: 1100,
      status: "VACANT",
    },
  });

  const unit104 = await prisma.unit.create({
    data: {
      name: "Unit 104 (Maintenance)",
      propertyId: prop1.id,
      rentAmount: 2200.00,
      depositAmt: 2200.00,
      rooms: 3,
      sqFootage: 1150,
      status: "MAINTENANCE",
    },
  });

  const unit201 = await prisma.unit.create({
    data: {
      name: "Unit 201",
      propertyId: prop2.id,
      rentAmount: 2500.00,
      depositAmt: 2500.00,
      rooms: 4,
      sqFootage: 1500,
      status: "OCCUPIED",
    },
  });

  const unit202 = await prisma.unit.create({
    data: {
      name: "Unit 202 (Vacant)",
      propertyId: prop2.id,
      rentAmount: 2600.00,
      depositAmt: 2600.00,
      rooms: 4,
      sqFootage: 1600,
      status: "VACANT",
    },
  });

  console.log("Creating active and expiring leases...");
  // 7. Leases
  const oneMonthMs = 30 * 24 * 60 * 60 * 1000;
  
  const lease1 = await prisma.lease.create({
    data: {
      unitId: unit101.id,
      tenantId: tenant1.id,
      startDate: new Date(Date.now() - 6 * oneMonthMs),
      endDate: new Date(Date.now() + 6 * oneMonthMs),
      monthlyRent: 1800.00,
      securityDeposit: 1800.00,
      status: "ACTIVE",
    },
  });

  // Lease expiring in 15 days to trigger alerts
  const lease2 = await prisma.lease.create({
    data: {
      unitId: unit102.id,
      tenantId: tenant3.id,
      startDate: new Date(Date.now() - 11 * oneMonthMs),
      endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      monthlyRent: 1900.00,
      securityDeposit: 1900.00,
      status: "ACTIVE",
    },
  });

  const lease3 = await prisma.lease.create({
    data: {
      unitId: unit201.id,
      tenantId: tenant2.id,
      startDate: new Date(Date.now() - 2 * oneMonthMs),
      endDate: new Date(Date.now() + 10 * oneMonthMs),
      monthlyRent: 2500.00,
      securityDeposit: 2500.00,
      status: "ACTIVE",
    },
  });

  console.log("Seeding financial invoices and transactions...");
  // 8. Invoices
  // Tenant 1 Paid Rent 1 month ago
  const inv1A = await prisma.invoice.create({
    data: {
      leaseId: lease1.id,
      amount: 1800.00,
      dueDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
      status: "PAID",
      paymentMethod: "STRIPE",
    },
  });

  // Tenant 1 Overdue Rent
  const inv1B = await prisma.invoice.create({
    data: {
      leaseId: lease1.id,
      amount: 1800.00,
      dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      status: "OVERDUE",
    },
  });

  // Tenant 1 Future Unpaid Rent
  const inv1C = await prisma.invoice.create({
    data: {
      leaseId: lease1.id,
      amount: 1800.00,
      dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      status: "UNPAID",
    },
  });

  // Tenant 3 Paid Rent
  const inv2 = await prisma.invoice.create({
    data: {
      leaseId: lease2.id,
      amount: 1900.00,
      dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      status: "PAID",
      paymentMethod: "BANK_TRANSFER",
    },
  });

  // Tenant 2 Paid Rent
  const inv3 = await prisma.invoice.create({
    data: {
      leaseId: lease3.id,
      amount: 2500.00,
      dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      status: "PAID",
      paymentMethod: "STRIPE",
    },
  });

  // 9. Transactions
  await prisma.transaction.create({
    data: {
      type: "INCOME",
      category: "RENT",
      amount: 1800.00,
      reference: "TX-STRIPE-001",
      status: "COMPLETED",
      tenantId: tenant1.id,
      createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.transaction.create({
    data: {
      type: "INCOME",
      category: "RENT",
      amount: 1900.00,
      reference: "TX-BANK-002",
      status: "COMPLETED",
      tenantId: tenant3.id,
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.transaction.create({
    data: {
      type: "INCOME",
      category: "RENT",
      amount: 2500.00,
      reference: "TX-STRIPE-003",
      status: "COMPLETED",
      tenantId: tenant2.id,
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    },
  });

  // Maintenance expense (Unit 104)
  await prisma.transaction.create({
    data: {
      type: "EXPENSE",
      category: "MAINTENANCE",
      amount: 350.00,
      reference: "TX-CASH-OUT-001",
      status: "COMPLETED",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  console.log("Seeding maintenance requests and applications...");
  // 10. Maintenance Requests
  await prisma.maintenanceRequest.create({
    data: {
      unitId: unit101.id,
      tenantId: tenant1.id,
      title: "Bathroom sink leakage",
      description: "Sink pipe is slowly leaking into the wooden cabinet base.",
      category: "PLUMBING",
      priority: "MEDIUM",
      status: "RESOLVED",
      estimatedCost: 120.00,
      scheduledDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
  });

  // Emergency maintenance request assigned to Alex
  await prisma.maintenanceRequest.create({
    data: {
      unitId: unit104.id,
      tenantId: tenant1.id,
      title: "Kitchen sparks and outlet failure",
      description: "Two outlets sparked upon plugging in the microwave, power now dead in kitchen.",
      category: "ELECTRICAL",
      priority: "EMERGENCY",
      status: "ASSIGNED",
      inspectorId: inspector.id,
      estimatedCost: 350.00,
      scheduledDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  });

  // 11. Payout Requests
  await prisma.payoutRequest.create({
    data: {
      ownerId: owner1.id,
      amount: 2000.00,
      status: PayoutStatus.COMPLETED,
      bankName: "Chase Bank",
      accountNumber: "111122223333",
      accountName: "Horizon Properties LLC",
    },
  });

  await prisma.payoutRequest.create({
    data: {
      ownerId: owner1.id,
      amount: 1500.00,
      status: PayoutStatus.PENDING,
      bankName: "Chase Bank",
      accountNumber: "111122223333",
      accountName: "Horizon Properties LLC",
    },
  });

  // 12. Lease Applications
  await prisma.application.create({
    data: {
      unitId: unit103.id,
      name: tenant4.name as string,
      email: tenant4.email,
      phone: tenant4.phone as string,
      status: "PENDING",
    },
  });

  console.log("Seeding documents and message logs...");
  // 13. Documents
  await prisma.document.create({
    data: {
      name: "Signed Lease Agreement.pdf",
      url: "/documents/lease_agreement.pdf",
      category: "LEASE",
      type: "Lease",
      description: "Signed demo lease agreement.",
      tags: ["lease", "rent", "contract"],
      fileSize: "1.2 MB",
      tenantId: tenant1.id,
      propertyId: prop1.id,
    },
  });

  await prisma.document.create({
    data: {
      name: "Renters Insurance Policy.pdf",
      url: "/documents/renters_insurance.pdf",
      category: "INSURANCE",
      type: "Insurance",
      description: "Active renters insurance policy document.",
      tags: ["insurance", "renters"],
      fileSize: "850 KB",
      tenantId: tenant1.id,
      propertyId: prop1.id,
    },
  });

  // 14. Message Threads
  // Tenant 1 & Owner 1 chat
  await prisma.message.create({
    data: {
      senderId: tenant1.id,
      receiverId: owner1.id,
      content: "Hello Owner, I wanted to ask about the move-in document requirement.",
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.message.create({
    data: {
      senderId: owner1.id,
      receiverId: tenant1.id,
      content: "Hello John! You can upload your renter's insurance directly in the Documents tab of your portal.",
      createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
    },
  });

  // Tenant 1 & Inspector chat
  await prisma.message.create({
    data: {
      senderId: tenant1.id,
      receiverId: inspector.id,
      content: "Hi Inspector Alex, what time will you arrive tomorrow for the kitchen outlet repair?",
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.message.create({
    data: {
      senderId: inspector.id,
      receiverId: tenant1.id,
      content: "Hi John, I will be arriving tomorrow morning at 10:00 AM.",
      createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
    },
  });

  // ── NOTIFICATIONS ──────────────────────────────────────────────────────────
  console.log("Seeding notifications...");

  const notificationData = [
    // Owner One notifications
    { userId: owner1.id, title: "Rent Payment Received", message: "Tenant John Doe has successfully paid $2,400 rent for Unit 101 at Grand Horizon Apartments for the month of June 2026.", type: "PAYMENT", priority: "MEDIUM", isRead: false, createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000) },
    { userId: owner1.id, title: "New Maintenance Request Submitted", message: "John Doe has submitted a new maintenance request for Unit 101: 'Kitchen outlet not working – outlets near the sink have stopped functioning'. Priority: HIGH.", type: "MAINTENANCE", priority: "HIGH", isRead: false, createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000) },
    { userId: owner1.id, title: "Lease Expiring Soon – Unit 201", message: "The lease for Unit 201 (Grand Horizon Apartments) is expiring in 28 days on July 28, 2026. Please contact the tenant to arrange a renewal or prepare for vacancy.", type: "LEASE", priority: "HIGH", isRead: false, createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000) },
    { userId: owner1.id, title: "Tenant Application Received", message: "A new rental application has been submitted for Unit 102 at Grand Horizon Apartments. Applicant: Emily Rose. Please review at your earliest convenience.", type: "SYSTEM", priority: "MEDIUM", isRead: true, createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
    { userId: owner1.id, title: "Inspection Completed – Unit 301", message: "Inspector Alex Johnson has completed the scheduled inspection of Unit 301. No critical issues were found. Report is now available in the Inspections section.", type: "SYSTEM", priority: "LOW", isRead: true, createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
    { userId: owner1.id, title: "Payment Failed – Unit 202", message: "The automatic rent payment of $1,800 for Unit 202 has failed due to insufficient funds. Please follow up with the tenant immediately.", type: "PAYMENT", priority: "HIGH", isRead: false, createdAt: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000) },
    { userId: owner1.id, title: "Document Uploaded by Tenant", message: "John Doe has uploaded a new document: 'Renter's Insurance Policy – June 2026'. You can view it in the Documents section of their tenant profile.", type: "SYSTEM", priority: "LOW", isRead: true, createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
    { userId: owner1.id, title: "Maintenance Request Resolved", message: "The maintenance request 'Leaking faucet in bathroom' for Unit 103 has been marked as resolved by Inspector Alex Johnson.", type: "MAINTENANCE", priority: "LOW", isRead: true, createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
    { userId: owner1.id, title: "New Message from Tenant", message: "John Doe has sent you a new message: 'Hello Owner, I wanted to ask about the move-in document requirement.' Check your inbox to reply.", type: "SYSTEM", priority: "MEDIUM", isRead: true, createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
    { userId: owner1.id, title: "Property Tax Reminder", message: "This is a reminder that the annual property tax for Grand Horizon Apartments (123 Main Street) is due on July 15, 2026. Please ensure timely payment.", type: "SYSTEM", priority: "HIGH", isRead: false, createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000) },
    { userId: owner1.id, title: "Payout Request Approved", message: "Your payout request of $5,400 from your Horizon Properties LLC account (Chase Bank) has been approved and is being processed.", type: "PAYMENT", priority: "MEDIUM", isRead: true, createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
    { userId: owner1.id, title: "Unit Marked as Available", message: "Unit 401 at Grand Horizon Apartments has been marked as 'Available' following the completion of the vacancy review. You can now list it for new tenants.", type: "SYSTEM", priority: "LOW", isRead: true, createdAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000) },

    // Tenant One notifications  
    { userId: tenant1.id, title: "Rent Due Reminder", message: "Your rent of $2,400 for Unit 101 at Grand Horizon Apartments is due in 3 days on July 1, 2026. Please ensure your payment method is up to date.", type: "PAYMENT", priority: "HIGH", isRead: false, createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    { userId: tenant1.id, title: "Maintenance Request Update", message: "Your maintenance request 'Kitchen outlet not working' has been assigned to Inspector Alex Johnson. Expected resolution: within 48 hours.", type: "MAINTENANCE", priority: "MEDIUM", isRead: false, createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000) },
    { userId: tenant1.id, title: "Lease Renewal Notice", message: "Your lease for Unit 101 at Grand Horizon Apartments expires on August 31, 2026. Please contact your property manager to discuss renewal options.", type: "LEASE", priority: "HIGH", isRead: true, createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
    { userId: tenant1.id, title: "Payment Confirmed – June 2026", message: "Your rent payment of $2,400 for Unit 101 (June 2026) has been successfully processed. Transaction ID: TXN-202606-0012. Keep this for your records.", type: "PAYMENT", priority: "LOW", isRead: true, createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
    { userId: tenant1.id, title: "Inspector Visiting Tomorrow", message: "Inspector Alex Johnson will be visiting Unit 101 tomorrow at 10:00 AM for the scheduled kitchen outlet repair. Please ensure access to the unit.", type: "MAINTENANCE", priority: "MEDIUM", isRead: false, createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000) },

    // Admin notifications
    { userId: admin.id, title: "New User Registration", message: "A new Owner account has been registered: 'Owner Two (Silver Creek)'. Please review and verify the account details in the user management section.", type: "SYSTEM", priority: "MEDIUM", isRead: false, createdAt: new Date(Date.now() - 30 * 60 * 1000) },
    { userId: admin.id, title: "Failed Payment Alert – Platform Level", message: "3 tenant payments have failed in the last 24 hours. Properties affected: Grand Horizon Apt, Silver Creek Residences. Review in the Transactions dashboard.", type: "PAYMENT", priority: "HIGH", isRead: false, createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000) },
    { userId: admin.id, title: "System Health Report", message: "The daily system health check has completed successfully. Database: Healthy. API Response Time: 234ms average. No critical errors reported.", type: "SYSTEM", priority: "LOW", isRead: true, createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000) },
  ];

  await prisma.notification.createMany({ data: notificationData });

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Error during database seed execution:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
