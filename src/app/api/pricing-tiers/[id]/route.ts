import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await req.json();
    const stripe = getStripe();

    const existingTier = await prisma.pricingTier.findUnique({ where: { id } });
    if (!existingTier) {
      return NextResponse.json({ error: "Pricing tier not found" }, { status: 404 });
    }

    let updatedStripePriceId = existingTier.stripePriceId;

    // If Stripe details exist, sync name, description and price
    if (existingTier.stripeProductId) {
      try {
        await stripe.products.update(existingTier.stripeProductId, {
          name: `${data.name || existingTier.name} Subscription`,
          description: data.description || existingTier.description || undefined,
        });

        // Price changed -> Create a new Stripe Price and archive the old one
        if (data.price !== undefined && Number(data.price) !== existingTier.price) {
          const newPrice = await stripe.prices.create({
            product: existingTier.stripeProductId,
            unit_amount: Math.round(Number(data.price) * 100),
            currency: "usd",
            recurring: { interval: "month" },
          });

          updatedStripePriceId = newPrice.id;

          if (existingTier.stripePriceId) {
            await stripe.prices.update(existingTier.stripePriceId, { active: false });
          }
        }
      } catch (stripeErr: any) {
        console.error("[Pricing Tier Sync Error]:", stripeErr?.message);
      }
    }

    const updatedTier = await prisma.pricingTier.update({
      where: { id: id },
      data: {
        name: data.name,
        description: data.description,
        price: data.price !== undefined ? Number(data.price) : undefined,
        minUnits: data.minUnits !== undefined ? Number(data.minUnits) : undefined,
        maxUnits: data.maxUnits !== undefined ? Number(data.maxUnits) : undefined,
        maxInspectors: data.maxInspectors !== undefined ? Number(data.maxInspectors) : undefined,
        trialDays: data.trialDays !== undefined ? Number(data.trialDays) : undefined,
        features: data.features,
        isCustom: data.isCustom,
        isActive: data.isActive,
        stripePriceId: updatedStripePriceId,
      }
    });
    return NextResponse.json(updatedTier);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update pricing tier" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stripe = getStripe();
    const existingTier = await prisma.pricingTier.findUnique({ where: { id } });

    if (existingTier) {
      if (existingTier.stripeProductId) {
        try {
          await stripe.products.update(existingTier.stripeProductId, { active: false });
        } catch (stripeErr: any) {
          console.error("[Pricing Tier Deactivation Error]:", stripeErr?.message);
        }
      }
      if (existingTier.stripePriceId) {
        try {
          await stripe.prices.update(existingTier.stripePriceId, { active: false });
        } catch (stripeErr: any) {
          console.error("[Pricing Price Deactivation Error]:", stripeErr?.message);
        }
      }
    }

    await prisma.pricingTier.delete({
      where: { id: id }
    });
    return NextResponse.json({ message: "Pricing tier deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete pricing tier" }, { status: 500 });
  }
}
