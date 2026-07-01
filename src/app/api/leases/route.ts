import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  try {
    let leases: any[] = [];
    if (role === "SUPERADMIN") {
      leases = await prisma.lease.findMany({
        include: { tenant: true, unit: { include: { property: true } } },
      });
    } else if (role === "OWNER") {
      leases = await prisma.lease.findMany({
        where: { unit: { property: { ownerId: userId } } },
        include: { tenant: true, unit: { include: { property: true } } },
      });
    } else if (role === "TENANT") {
      leases = await prisma.lease.findMany({
        where: { tenantId: userId },
        include: { tenant: true, unit: { include: { property: true } } },
      });
    } else {
      leases = [];
    }

    return NextResponse.json(leases);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch leases" }, { status: 500 });
  }
}

import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { 
      unitId, tenantEmail, startDate, endDate, monthlyRent, applicationId,
      rentDueDay, securityDeposit, lateFeeAmount, gracePeriodDays, lateFeeType, 
      autoGenerateInvoices, autoEmailInvoices, renewalNoticeDays
    } = await req.json();

    if (!unitId || !tenantEmail || !startDate || !endDate || !monthlyRent) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify unit exists
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: { property: true },
    });

    if (!unit || unit.property.ownerId !== (session.user as any).id) {
      return NextResponse.json({ error: "Unit not found or access denied" }, { status: 404 });
    }

    if (unit.property.approvalStatus !== "APPROVED") {
      return NextResponse.json(
        { error: "Cannot create a lease for a property that is pending administrative approval." },
        { status: 403 }
      );
    }

    // Find or create tenant by email
    let tenantUser = await prisma.user.findUnique({
      where: { email: tenantEmail },
    });

    if (!tenantUser) {
      // Auto-create tenant
      const randomPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      
      // We will try to fetch the name and phone from the application if it exists
      let tenantName = "New Tenant";
      let tenantPhone = null;
      if (applicationId) {
        const app = await prisma.application.findUnique({ where: { id: applicationId } });
        if (app) {
          tenantName = app.name;
          tenantPhone = app.phone;
        }
      }

      tenantUser = await prisma.user.create({
        data: {
          email: tenantEmail,
          password: hashedPassword,
          name: tenantName,
          phone: tenantPhone,
          role: "TENANT",
        },
      });
    } else if (tenantUser.role !== "TENANT") {
      return NextResponse.json({ error: "User with this email exists but is not a tenant" }, { status: 400 });
    }

    // Create lease (status PENDING_SIGNATURE) and first invoices
    // Note: Unit status remains VACANT until tenant signs
    const lease = await prisma.lease.create({
      data: {
        unitId,
        tenantId: tenantUser.id,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        monthlyRent: Number(monthlyRent),
        status: "PENDING_SIGNATURE",
        rentDueDay: rentDueDay ? Number(rentDueDay) : 1,
        securityDeposit: securityDeposit ? Number(securityDeposit) : null,
        lateFeeAmount: lateFeeAmount ? Number(lateFeeAmount) : null,
        gracePeriodDays: gracePeriodDays ? Number(gracePeriodDays) : 5,
        lateFeeType: lateFeeType || "FIXED",
        autoGenerateInvoices: autoGenerateInvoices !== undefined ? autoGenerateInvoices : true,
        autoEmailInvoices: autoEmailInvoices !== undefined ? autoEmailInvoices : false,
        renewalNoticeDays: renewalNoticeDays ? Number(renewalNoticeDays) : 60,
      },
    });

    // Prorated Rent Automation (Phase 1)
    const start = new Date(startDate);
    const startDay = start.getDate();
    let firstMonthRentAmount = Number(monthlyRent);
    
    if (startDay > 1) {
      // Calculate based on exact days in the starting month
      const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
      const daysLived = daysInMonth - startDay + 1; // +1 to include move-in day
      const dailyRate = Number(monthlyRent) / daysInMonth;
      firstMonthRentAmount = dailyRate * daysLived;
    }

    // Generate initial invoice (Prorated if mid-month)
    await prisma.invoice.create({
      data: {
        leaseId: lease.id,
        amount: Number(firstMonthRentAmount.toFixed(2)),
        dueDate: start,
        status: "UNPAID",
      },
    });

    if (Number(unit.depositAmt) > 0) {
      await prisma.invoice.create({
        data: {
          leaseId: lease.id,
          amount: Number(unit.depositAmt),
          dueDate: new Date(), // Due immediately
          status: "UNPAID",
        },
      });
    }

    // Mark application as LEASE_CREATED if provided
    if (applicationId) {
      await prisma.application.update({
        where: { id: applicationId },
        data: { status: "LEASE_CREATED" },
      });
    }

    return NextResponse.json(lease, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create lease" }, { status: 500 });
  }
}
