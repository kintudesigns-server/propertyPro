import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed execution...');

  // 1. Clean Database (Delete in reverse order of dependencies to avoid FK constraints)
  console.log('Cleaning existing data...');
  await prisma.notification.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.tour.deleteMany({});
  await prisma.application.deleteMany({});
  await prisma.maintenanceRequest.deleteMany({});
  await prisma.lease.deleteMany({});
  await prisma.unit.deleteMany({});
  await prisma.property.deleteMany({});
  await prisma.user.deleteMany({});

  const passwordHash = await bcrypt.hash('password123', 10);

  // 2. Core Platform Users
  console.log('Creating core users...');
  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: passwordHash,
      name: 'System Admin',
      role: 'SUPERADMIN',
    },
  });

  const owner = await prisma.user.create({
    data: {
      email: 'owner@example.com',
      password: passwordHash,
      name: 'Portfolio Owner',
      phone: '555-0100',
      role: 'OWNER',
    },
  });

  const inspector = await prisma.user.create({
    data: {
      email: 'inspector@example.com',
      password: passwordHash,
      name: 'Property Inspector',
      phone: '555-0101',
      role: 'INSPECTOR',
    },
  });

  const newTenant = await prisma.user.create({
    data: {
      email: 'newtenant@example.com',
      password: passwordHash,
      name: 'New Tenant (Onboarding)',
      phone: '555-0102',
      role: 'TENANT',
    },
  });

  const activeTenant = await prisma.user.create({
    data: {
      email: 'activetenant@example.com',
      password: passwordHash,
      name: 'Active Tenant',
      phone: '555-0103',
      role: 'TENANT',
    },
  });

  const leavingTenant = await prisma.user.create({
    data: {
      email: 'leavingtenant@example.com',
      password: passwordHash,
      name: 'Leaving Tenant (Early Break)',
      phone: '555-0104',
      role: 'TENANT',
    },
  });

  // 3. Properties
  console.log('Creating properties & units...');
  const sunsetApts = await prisma.property.create({
    data: {
      name: 'Sunset Apartments',
      address: '123 Sunset Blvd',
      city: 'Los Angeles',
      state: 'CA',
      zip: '90028',
      country: 'USA',
      type: 'MULTI_FAMILY',
      ownerId: owner.id,
      approvalStatus: 'APPROVED',
      units: {
        create: [
          {
            name: '101',
            type: '1B1B',
            rentAmount: 2000.0,
            depositAmt: 2000.0,
            rooms: 1,
            bathrooms: 1,
            sqFootage: 800,
            status: 'OCCUPIED',
          },
          {
            name: '102',
            type: '2B2B',
            rentAmount: 3000.0,
            depositAmt: 3000.0,
            rooms: 2,
            bathrooms: 2,
            sqFootage: 1200,
            status: 'OCCUPIED',
          },
          {
            name: '103',
            type: 'Studio',
            rentAmount: 1500.0,
            depositAmt: 1500.0,
            rooms: 0,
            bathrooms: 1,
            sqFootage: 500,
            status: 'VACANT',
          },
        ],
      },
    },
    include: { units: true },
  });

  const downtownLoft = await prisma.property.create({
    data: {
      name: 'Downtown Premium Loft',
      address: '456 Urban Ave',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      country: 'USA',
      type: 'SINGLE_FAMILY',
      ownerId: owner.id,
      approvalStatus: 'APPROVED',
      units: {
        create: [
          {
            name: 'Penthouse',
            type: '3B3B',
            rentAmount: 5500.0,
            depositAmt: 5500.0,
            rooms: 3,
            bathrooms: 3,
            sqFootage: 2500,
            status: 'OCCUPIED',
          },
        ],
      },
    },
    include: { units: true },
  });

  const unit101 = sunsetApts.units.find((u) => u.name === '101')!;
  const unit102 = sunsetApts.units.find((u) => u.name === '102')!;
  const penthouse = downtownLoft.units[0];

  // 4. Leases
  console.log('Creating leases and financials...');
  const now = new Date();
  
  // A. Onboarding Lease (Pending Signature & Unpaid Deposit)
  const leaseOnboarding = await prisma.lease.create({
    data: {
      unitId: penthouse.id,
      tenantId: newTenant.id,
      startDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      endDate: new Date(now.getFullYear() + 1, now.getMonth() + 1, 1),
      monthlyRent: penthouse.rentAmount,
      securityDeposit: penthouse.depositAmt,
      status: 'PENDING_SIGNATURE',
      earlyTerminationFee: 5500.0,
      isProratedRefundAllowed: false,
    },
  });

  await prisma.invoice.create({
    data: {
      leaseId: leaseOnboarding.id,
      amount: penthouse.depositAmt,
      dueDate: new Date(now.getFullYear(), now.getMonth(), 28),
      status: 'UNPAID',
    },
  });

  // B. Active Lease (Paid deposit, 1 past paid rent, 1 current unpaid rent)
  const leaseActive = await prisma.lease.create({
    data: {
      unitId: unit101.id,
      tenantId: activeTenant.id,
      startDate: new Date(now.getFullYear(), now.getMonth() - 2, 1),
      endDate: new Date(now.getFullYear() + 1, now.getMonth() - 2, 1),
      monthlyRent: unit101.rentAmount,
      securityDeposit: unit101.depositAmt,
      status: 'ACTIVE',
      depositStatus: 'HELD',
    },
  });

  await prisma.invoice.create({
    data: {
      leaseId: leaseActive.id,
      amount: unit101.depositAmt,
      dueDate: new Date(now.getFullYear(), now.getMonth() - 2, 1),
      status: 'PAID',
    },
  });
  
  await prisma.invoice.create({
    data: {
      leaseId: leaseActive.id,
      amount: unit101.rentAmount,
      dueDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      status: 'PAID',
    },
  });

  await prisma.invoice.create({
    data: {
      leaseId: leaseActive.id,
      amount: unit101.rentAmount,
      dueDate: new Date(now.getFullYear(), now.getMonth(), 1),
      status: 'UNPAID',
    },
  });

  // C. Early Termination Lease (Moving out, inspection scheduled)
  const leaseEarlyBreak = await prisma.lease.create({
    data: {
      unitId: unit102.id,
      tenantId: leavingTenant.id,
      startDate: new Date(now.getFullYear(), now.getMonth() - 5, 1),
      endDate: new Date(now.getFullYear() + 1, now.getMonth() - 5, 1),
      monthlyRent: unit102.rentAmount,
      securityDeposit: unit102.depositAmt,
      status: 'ACTIVE',
      depositStatus: 'HELD',
      
      // Early Term Fields
      earlyTerminationFee: 3000.0,
      isProratedRefundAllowed: true,
      
      // Move Out Lifecycle
      moveOutStatus: 'INSPECTION_SCHEDULED',
      moveOutRequestDate: new Date(now.getFullYear(), now.getMonth(), 5),
      moveOutDate: new Date(now.getFullYear(), now.getMonth(), 20),
      moveOutReason: 'Relocating for work',
      moveOutNoticeDays: 15,
      moveOutInspectorId: inspector.id,
      inspectionDate: new Date(now.getFullYear(), now.getMonth(), 21),
    },
  });

  await prisma.invoice.create({
    data: {
      leaseId: leaseEarlyBreak.id,
      amount: unit102.depositAmt,
      dueDate: new Date(now.getFullYear(), now.getMonth() - 5, 1),
      status: 'PAID',
    },
  });

  await prisma.invoice.create({
    data: {
      leaseId: leaseEarlyBreak.id,
      amount: 3000.0,
      dueDate: new Date(now.getFullYear(), now.getMonth(), 5),
      status: 'UNPAID', // The early termination fee invoice
    },
  });

  // 5. Applications (For Owner Dashboard)
  console.log('Creating applications...');
  await prisma.application.create({
    data: {
      unitId: sunsetApts.units[2].id, // The vacant studio
      name: 'John Prospect',
      email: 'johnprospect@example.com',
      phone: '555-0109',
      monthlyIncome: 60000,
      moveInDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      leaseDuration: 12,
      status: 'PENDING',
    },
  });

  // 6. Maintenance Requests
  console.log('Creating maintenance requests...');
  await prisma.maintenanceRequest.create({
    data: {
      unitId: unit101.id, // Active tenant's unit
      tenantId: activeTenant.id,
      title: 'Leaking Faucet in Kitchen',
      description: 'The kitchen faucet drips continuously causing a mess.',
      priority: 'LOW',
      status: 'IN_PROGRESS',
    },
  });

  await prisma.maintenanceRequest.create({
    data: {
      unitId: unit101.id,
      tenantId: activeTenant.id,
      title: 'AC Not Cooling',
      description: 'The AC unit turns on but blows warm air.',
      priority: 'HIGH',
      status: 'PENDING',
    },
  });

  // 7. Notifications
  console.log('Creating notifications...');
  await prisma.notification.create({
    data: {
      userId: activeTenant.id,
      title: 'Rent Reminder',
      message: 'Your rent payment of $2,000 is due soon.',
      type: 'PAYMENT',
      priority: 'NORMAL',
      isRead: false,
    },
  });
  
  await prisma.notification.create({
    data: {
      userId: activeTenant.id,
      title: 'Maintenance Updated',
      message: 'Your request "Leaking Faucet" is now In Progress.',
      type: 'MAINTENANCE',
      priority: 'NORMAL',
      isRead: true,
    },
  });

  await prisma.notification.create({
    data: {
      userId: owner.id,
      title: 'Early Termination Request',
      message: 'Tenant at 102 requested early termination.',
      type: 'LEASE',
      priority: 'HIGH',
      isRead: false,
    },
  });

  console.log('Seed execution completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
