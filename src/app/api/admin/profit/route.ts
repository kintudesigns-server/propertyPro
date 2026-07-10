import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  // Strictly limit to SUPERADMIN
  if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Calculate total platform profit from admin fees on PAID invoices
    // and pull all the details
    const paidInvoices = await (prisma.invoice as any).findMany({
      where: {
        status: "PAID",
        adminFee: { gt: 0 } // Only invoices where we actually took a fee
      },
      orderBy: { createdAt: 'desc' },
      include: {
        lease: {
          include: {
            unit: {
              include: {
                property: {
                  include: { owner: { select: { name: true, email: true } } }
                }
              }
            },
            tenant: { select: { name: true, email: true } }
          }
        }
      }
    });

    const detailedProfits = (paidInvoices as any[]).map((inv: any) => {
      const gross = Number(inv.amount || 0);
      const fee = Number(inv.adminFee || 0);
      const net = Number(inv.netToOwner || 0);
      const percentage = gross > 0 ? ((fee / gross) * 100).toFixed(1) : "0.0";
      
      return {
        id: inv.id,
        date: inv.createdAt,
        dueDate: inv.dueDate,
        property: inv.lease.unit.property.name,
        unit: inv.lease.unit.name,
        owner: inv.lease.unit.property.owner.name || inv.lease.unit.property.owner.email,
        tenant: inv.lease.tenant?.name || inv.lease.tenant?.email || "Unknown",
        grossAmount: gross,
        platformFee: fee,
        percentageCut: percentage,
        netToOwner: net,
      }
    });

    const totalProfit = detailedProfits.reduce((sum, inv) => sum + inv.platformFee, 0);

    // Calculate total platform gross volume (all rent processed)
    const totalVolume = await prisma.transaction.aggregate({
      where: {
        status: "COMPLETED",
        type: "INCOME"
      },
      _sum: {
        amount: true
      }
    });

    // Subtract completed Stripe refunds from total processed volume
    const totalRefunds = await prisma.transaction.aggregate({
      where: {
        status: "COMPLETED",
        type: "EXPENSE",
        reference: { startsWith: "STRIPE_REFUND" }
      },
      _sum: {
        amount: true
      }
    });

    // Calculate Monthly Recurring Revenue (MRR) from active owner subscriptions
    const activeSubscribers = await prisma.user.findMany({
      where: {
        role: "OWNER",
        subscriptionStatus: { in: ["active", "Active", "ACTIVE"] },
        pricingTier: { isNot: null }
      },
      include: { pricingTier: true }
    });

    const subscriptionMRR = activeSubscribers.reduce((sum, owner) => sum + Number(owner.pricingTier?.price || 0), 0);

    const detailedSubscriptions = activeSubscribers.map(owner => ({
      id: owner.id,
      owner: owner.name || owner.email,
      tier: owner.pricingTier?.name || "Unknown",
      monthlyPrice: Number(owner.pricingTier?.price || 0),
      status: owner.subscriptionStatus,
      joinedAt: owner.createdAt
    }));

    const netVolume = Math.max(0, Number(totalVolume._sum.amount || 0) - Number(totalRefunds._sum.amount || 0));

    return NextResponse.json({
      totalCommissionProfit: totalProfit,
      subscriptionMRR,
      totalProfit: totalProfit + subscriptionMRR,
      totalVolumeProcessed: netVolume + totalProfit, // gross volume net of refunds
      detailedProfits,
      detailedSubscriptions
    });

  } catch (error: any) {
    console.error("Admin Profit fetch error:", error);
    return NextResponse.json({ error: "Failed to load platform profit" }, { status: 500 });
  }
}
