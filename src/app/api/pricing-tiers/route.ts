import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export async function GET(req: NextRequest) {
  try {
    const tiers = await prisma.pricingTier.findMany({
      orderBy: { price: 'asc' }
    });
    return NextResponse.json(tiers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch pricing tiers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await req.json();
    const stripe = getStripe();

    // 1. Create Stripe Product
    const product = await stripe.products.create({
      name: `${data.name} Subscription`,
      description: data.description || `Up to ${data.maxUnits} units`,
      metadata: {
        tierName: data.name
      }
    });

    // 2. Create Stripe Price
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(Number(data.price) * 100),
      currency: "usd",
      recurring: { interval: "month" },
    });

    const newTier = await prisma.pricingTier.create({
      data: {
        name: data.name,
        description: data.description,
        price: Number(data.price),
        minUnits: Number(data.minUnits),
        maxUnits: Number(data.maxUnits),
        maxInspectors: data.maxInspectors !== undefined ? Number(data.maxInspectors) : 1,
        trialDays: data.trialDays !== undefined ? Number(data.trialDays) : 0,
        features: data.features,
        isCustom: data.isCustom || false,
        isActive: data.isActive !== undefined ? data.isActive : true,
        stripeProductId: product.id,
        stripePriceId: price.id,
      }
    });
    return NextResponse.json(newTier, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create pricing tier" }, { status: 500 });
  }
}
