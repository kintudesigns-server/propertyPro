import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;

    let ownerFilter = {};
    if (role === "OWNER") {
      ownerFilter = { ownerId: userId };
    }
    // If SUPERADMIN, ownerFilter remains empty to fetch everything

    // 1. Total Properties
    const totalProperties = await prisma.property.count({
      where: ownerFilter,
    });

    // 2. Occupancy Rate
    const units = await prisma.unit.findMany({
      where: {
        property: ownerFilter,
      },
      select: { status: true, rentAmount: true },
    });
    const totalUnits = units.length;
    const occupiedUnits = units.filter((u) => u.status === "OCCUPIED").length;
    const vacantUnits = totalUnits - occupiedUnits;
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;
    const vacancyRate = totalUnits > 0 ? (vacantUnits / totalUnits) * 100 : 0;

    // 3. Average Rent
    let totalRentPotential = 0;
    units.forEach((u) => {
      totalRentPotential += Number(u.rentAmount);
    });
    const averageRent = totalUnits > 0 ? totalRentPotential / totalUnits : 0;

    // 4. Invoices (Revenue and Collection Rate)
    const currentMonth = new Date();
    currentMonth.setDate(1); // Beginning of month

    const invoices = await prisma.invoice.findMany({
      where: {
        lease: {
          unit: {
            property: ownerFilter,
          },
        },
      },
    });

    const currentMonthInvoices = invoices.filter((inv) => inv.createdAt >= currentMonth);
    let monthlyRevenue = 0;
    let expectedRevenue = 0;
    let overduePayments = 0;

    currentMonthInvoices.forEach((inv) => {
      expectedRevenue += Number(inv.amount);
      if (inv.status === "PAID") {
        monthlyRevenue += Number(inv.amount);
      }
      if (inv.status === "OVERDUE") {
        overduePayments += 1;
      }
    });

    const collectionRate = expectedRevenue > 0 ? (monthlyRevenue / expectedRevenue) * 100 : 0;

    // 5. Tenants (Active and Pending)
    // Find all users who are tenants and have a lease in one of our properties
    const activeLeases = await prisma.lease.findMany({
      where: {
        status: "ACTIVE",
        unit: { property: ownerFilter },
      },
      include: { tenant: true },
    });
    const activeTenantsCount = new Set(activeLeases.map((l) => l.tenantId)).size;

    // 6. Maintenance Requests
    const maintenanceRequests = await prisma.maintenanceRequest.findMany({
      where: {
        unit: { property: ownerFilter },
      },
    });
    const totalMaintenance = maintenanceRequests.length;
    const urgentMaintenance = maintenanceRequests.filter(
      (m) => m.priority === "HIGH" || m.priority === "EMERGENCY"
    ).length;

    // 7. Expiring Leases (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expiringLeases = activeLeases.filter((l) => l.endDate <= thirtyDaysFromNow).length;

    // 5. Check Onboarding Progress
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { employmentStatus: true, bankName: true }
    });
    
    const profileComplete = !!user?.employmentStatus;
    const bankConnected = !!user?.bankName;

    return NextResponse.json({
      totalProperties,
      occupancyRate: occupancyRate.toFixed(1),
      vacancyRate: vacancyRate.toFixed(1),
      totalUnits,
      occupiedUnits,
      vacantUnits,
      monthlyRevenue,
      collectionRate: collectionRate.toFixed(1),
      activeTenantsCount,
      totalMaintenance,
      urgentMaintenance,
      averageRent,
      leaseRenewals: expiringLeases,
      overduePayments,
      recentEvents: 0, // Placeholder
      profileComplete,
      bankConnected,
    });
  } catch (err: any) {
    console.error("Dashboard Stats Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
