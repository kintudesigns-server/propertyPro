import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { checkModuleAccess, moduleLockedResponse } from "@/lib/module-guard";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;

    if (role !== "OWNER" && role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check module entitlement for OWNER
    if (role === "OWNER") {
      const access = await checkModuleAccess(userId, "analytics");
      if (!access.allowed) {
        return moduleLockedResponse(access);
      }
    }

    // Filter by owner if OWNER role, else fetch all for SUPERADMIN
    const ownerFilter = role === "OWNER" ? { ownerId: userId } : {};

    // 1. Fetch properties with units and leases
    const properties = await prisma.property.findMany({
      where: ownerFilter,
      include: {
        units: {
          include: {
            leases: {
              where: { status: "ACTIVE" }
            }
          }
        }
      }
    });

    const totalProperties = properties.length;

    // 2. Compute Unit Counts & Occupancy Metrics
    let totalUnits = 0;
    let occupiedUnits = 0;

    properties.forEach(p => {
      p.units.forEach(u => {
        totalUnits++;
        if (u.status === "OCCUPIED" || u.leases.length > 0) {
          occupiedUnits++;
        }
      });
    });

    const vacantUnits = totalUnits - occupiedUnits;
    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

    // 3. Fetch Transactions for Income & Expense breakdown
    const transactions = await prisma.transaction.findMany({
      where: role === "OWNER" ? {
        OR: [
          { invoice: { lease: { unit: { property: { ownerId: userId } } } } },
          { tenant: { leases: { some: { unit: { property: { ownerId: userId } } } } } }
        ],
        status: "COMPLETED"
      } : { status: "COMPLETED" },
      orderBy: { createdAt: "asc" }
    });

    let grossRevenue = 0;
    let totalExpenses = 0;
    let totalAdminFees = 0;

    transactions.forEach(tx => {
      const amt = Number(tx.amount || 0);
      const fee = Number(tx.feeDeducted || 0);
      totalAdminFees += fee;

      if (tx.type === "INCOME" || tx.category === "RENT" || tx.category === "DEPOSIT") {
        grossRevenue += amt;
      } else if (tx.type === "EXPENSE" || tx.category === "MAINTENANCE" || tx.category === "FEE") {
        totalExpenses += amt;
      }
    });

    const netOperatingIncome = grossRevenue - totalExpenses - totalAdminFees;

    // 4. Monthly Trend Data (Last 6 Months)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const monthlyTrends: Array<{
      month: string;
      revenue: number;
      expenses: number;
      net: number;
      occupancy: number;
    }> = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mLabel = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;

      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      let mRev = 0;
      let mExp = 0;

      transactions.forEach(tx => {
        const txDate = new Date(tx.createdAt);
        const amt = Number(tx.amount || 0);
        if (txDate >= startOfMonth && txDate <= endOfMonth) {
          if (tx.type === "INCOME" || tx.category === "RENT" || tx.category === "DEPOSIT") {
            mRev += amt;
          } else if (tx.type === "EXPENSE" || tx.category === "MAINTENANCE" || tx.category === "FEE") {
            mExp += amt;
          }
        }
      });

      monthlyTrends.push({
        month: mLabel,
        revenue: mRev,
        expenses: mExp,
        net: mRev - mExp,
        occupancy: occupancyRate
      });
    }

    // 5. Property Performance Leaderboard
    const propertyPerformance = properties.map(p => {
      const pUnits = p.units.length;
      const pOccupied = p.units.filter(u => u.status === "OCCUPIED" || u.leases.length > 0).length;
      const pOccRate = pUnits > 0 ? Math.round((pOccupied / pUnits) * 100) : 0;
      const monthlyPotential = p.units.reduce((sum, u) => sum + Number(u.rentAmount || 0), 0);
      const estimatedValue = monthlyPotential * 12 * 12; // 12x annual rent valuation
      const annualRent = monthlyPotential * 12 * (pOccRate / 100);
      const roiPercentage = estimatedValue > 0 ? Number(((annualRent / estimatedValue) * 100).toFixed(1)) : 0;

      return {
        id: p.id,
        name: p.name,
        city: p.city || "—",
        units: pUnits,
        occupiedUnits: pOccupied,
        occupancyRate: pOccRate,
        monthlyPotential,
        estimatedRoi: roiPercentage,
      };
    });

    const maintenanceCount = await prisma.maintenanceRequest.count({
      where: role === "OWNER" ? { unit: { property: { ownerId: userId } } } : {}
    });

    return NextResponse.json({
      summary: {
        totalProperties,
        totalUnits,
        occupiedUnits,
        vacantUnits,
        occupancyRate,
        grossRevenue,
        totalExpenses,
        totalAdminFees,
        netOperatingIncome,
        maintenanceCount,
      },
      monthlyTrends,
      propertyPerformance,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to compute portfolio analytics" }, { status: 500 });
  }
}
