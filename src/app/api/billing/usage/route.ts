import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        pricingTier: true,
        subscriptionHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const unitCount = await prisma.unit.count({
      where: { property: { ownerId: userId } },
    });

    const propertyCount = await prisma.property.count({
      where: { ownerId: userId },
    });

    const inspectorCount = await prisma.user.count({
      where: { role: "INSPECTOR", ownerId: userId },
    });

    const activeLeaseCount = await prisma.lease.count({
      where: {
        unit: { property: { ownerId: userId } },
        status: "ACTIVE",
      },
    });

    const maxUnits = user.pricingTier?.maxUnits ?? 5;
    const maxInspectors = user.pricingTier?.maxInspectors ?? 1;
    const percentUnitsUsed = Math.min(100, Math.round((unitCount / maxUnits) * 100));

    // Retrieve subscription renewal and historical invoices from Stripe
    let currentPeriodEnd: number | null = null;
    let cancelAtPeriodEnd = false;
    let invoices: Array<{
      id: string;
      number: string | null;
      amountPaid: number;
      currency: string;
      status: string;
      created: number;
      pdfUrl: string | null;
      hostedUrl: string | null;
    }> = [];

    if (user.stripeCustomerId || user.stripeSubscriptionId) {
      try {
        const stripe = getStripe();
        if (user.stripeSubscriptionId) {
          try {
            const sub: any = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
            currentPeriodEnd = sub.current_period_end ?? null;
            cancelAtPeriodEnd = Boolean(sub.cancel_at_period_end);
          } catch (e: any) {
            console.warn("[Billing API] Stripe subscription fetch notice:", e?.message);
          }
        }

        if (user.stripeCustomerId) {
          try {
            const stripeInvoices = await stripe.invoices.list({
              customer: user.stripeCustomerId,
              limit: 10,
            });
            invoices = stripeInvoices.data.map((inv) => ({
              id: inv.id,
              number: inv.number,
              amountPaid: (inv.amount_paid ?? inv.total ?? 0) / 100,
              currency: inv.currency || "usd",
              status: inv.status || "paid",
              created: inv.created,
              pdfUrl: inv.invoice_pdf || null,
              hostedUrl: inv.hosted_invoice_url || null,
            }));
          } catch (e: any) {
            console.warn("[Billing API] Stripe invoices fetch notice:", e?.message);
          }
        }
      } catch (e: any) {
        console.warn("[Billing API] Stripe init notice:", e?.message);
      }
    }

    return NextResponse.json({
      tier: user.pricingTier ? {
        id: user.pricingTier.id,
        name: user.pricingTier.name,
        price: user.pricingTier.price,
        maxUnits: user.pricingTier.maxUnits,
        maxInspectors: user.pricingTier.maxInspectors,
        features: user.pricingTier.features,
      } : {
        id: "starter_default",
        name: "Starter",
        price: 0,
        maxUnits: 5,
        maxInspectors: 1,
        features: ["Up to 5 Units", "Standard Support"],
      },
      subscriptionStatus: user.subscriptionStatus || "Active",
      gracePeriodEnd: user.gracePeriodEnd,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
      currentPeriodEnd,
      invoices,
      subscriptionHistory: user.subscriptionHistory || [],
      usage: {
        units: {
          current: unitCount,
          max: maxUnits,
          percent: percentUnitsUsed,
        },
        inspectors: {
          current: inspectorCount,
          max: maxInspectors,
          percent: Math.min(100, Math.round((inspectorCount / maxInspectors) * 100)),
        },
        properties: propertyCount,
        activeLeases: activeLeaseCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch usage statistics" },
      { status: 500 }
    );
  }
}
