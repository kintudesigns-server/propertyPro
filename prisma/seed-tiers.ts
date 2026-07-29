import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Pricing Tiers...");

  // Setup stripe if key exists
  let stripe: Stripe | null = null;
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (stripeKey) {
    try {
      stripe = new Stripe(stripeKey, {
        apiVersion: "2024-12-18.acacia" as any,
      });
      console.log("✅ Stripe client initialized for seeding");
    } catch (e: any) {
      console.warn("⚠️ Failed to initialize Stripe client:", e.message);
    }
  } else {
    console.warn("⚠️ STRIPE_SECRET_KEY not set. Tiers will be seeded without Stripe IDs.");
  }

  // Tiers to create
  const tierConfigs = [
    {
      name: "Essentials",
      description: "Perfect for single landlords managing up to 10 units with core operations.",
      price: 49,
      minUnits: 0,
      maxUnits: 10,
      maxInspectors: 0,
      trialDays: 14,
      isCustom: false,
      isActive: true,
      modules: [
        "properties",
        "leases",
        "tenants",
        "applications",
        "payments",
        "payouts",
        "maintenance",
        "documents",
        "tours"
      ],
      features: [
        "Properties & Units",
        "Lease Management",
        "Tenant Portal",
        "Tenant Applications",
        "Rent Payments",
        "Owner Payouts",
        "Maintenance Tickets",
        "Document Storage",
        "Property Tours"
      ]
    },
    {
      name: "Professional",
      description: "Ideal for active landlords managing 11 to 50 units with contractor support.",
      price: 149,
      minUnits: 11,
      maxUnits: 50,
      maxInspectors: 3,
      trialDays: 14,
      isCustom: false,
      isActive: true,
      modules: [
        "properties",
        "leases",
        "tenants",
        "applications",
        "payments",
        "payouts",
        "maintenance",
        "documents",
        "tours",
        "inspections",
        "team_management",
        "vendors",
        "invoices",
        "accounting"
      ],
      features: [
        "Properties & Units",
        "Lease Management",
        "Tenant Portal",
        "Tenant Applications",
        "Rent Payments",
        "Owner Payouts",
        "Maintenance Tickets",
        "Document Storage",
        "Property Tours",
        "Property Inspections",
        "External Vendors Integration",
        "Invoice Management",
        "Accounting & Financial Reports"
      ]
    },
    {
      name: "Enterprise",
      description: "Complete platform control for large portfolios and professional firms.",
      price: 0,
      minUnits: 51,
      maxUnits: 99999,
      maxInspectors: 99,
      trialDays: 30,
      isCustom: true,
      isActive: true,
      modules: [
        "properties",
        "leases",
        "tenants",
        "applications",
        "payments",
        "payouts",
        "maintenance",
        "documents",
        "tours",
        "inspections",
        "vendors",
        "invoices",
        "accounting",
        "messages",
        "calendar"
      ],
      features: [
        "Properties & Units",
        "Lease Management",
        "Tenant Portal",
        "Tenant Applications",
        "Rent Payments",
        "Owner Payouts",
        "Maintenance Tickets",
        "Document Storage",
        "Property Tours",
        "Property Inspections",
        "External Vendors Integration",
        "Invoice Management",
        "Accounting & Financial Reports",
        "Tenant Chat & Messaging",
        "Availability Calendar Booking",
        "Dedicated Account Support"
      ]
    }
  ];

  // 1. Identify which existing pricing tiers are in use
  const activeUserTiers = await prisma.user.findMany({
    where: { currentTierId: { not: null } },
    select: { currentTierId: true }
  });
  const inUseTierIds = new Set(activeUserTiers.map(u => u.currentTierId));
  console.log(`ℹ️ Found ${inUseTierIds.size} tier ID(s) currently in use by landlords.`);

  // 2. Clear old tiers NOT in use
  const deletedTiers = await prisma.pricingTier.deleteMany({
    where: {
      id: { notIn: Array.from(inUseTierIds) as string[] }
    }
  });
  console.log(`🧹 Deleted ${deletedTiers.count} unused old pricing tiers.`);

  // 3. Upsert the new 3 tiers
  for (const config of tierConfigs) {
    // Check if a tier with this name already exists and is in use
    const existing = await prisma.pricingTier.findFirst({
      where: { name: config.name }
    });

    if (existing && inUseTierIds.has(existing.id)) {
      console.log(`⚠️ Tier "${config.name}" (ID: ${existing.id}) is currently in use. Updating in-place to prevent breaking references...`);
      
      let stripeProductId = existing.stripeProductId;
      let stripePriceId = existing.stripePriceId;

      // Update stripe product if key exists and we have stripe ids or create them
      if (stripe) {
        try {
          if (stripeProductId) {
            await stripe.products.update(stripeProductId, {
              name: `${config.name} Subscription`,
              description: config.description,
            });
            // If price is different, create new stripe price
            if (config.price !== existing.price && !config.isCustom) {
              const newPrice = await stripe.prices.create({
                product: stripeProductId,
                unit_amount: Math.round(config.price * 100),
                currency: "usd",
                recurring: { interval: "month" },
              });
              stripePriceId = newPrice.id;
            }
          }
        } catch (e: any) {
          console.warn(`⚠️ Failed to sync Stripe info for existing "${config.name}":`, e.message);
        }
      }

      await prisma.pricingTier.update({
        where: { id: existing.id },
        data: {
          description: config.description,
          price: config.price,
          minUnits: config.minUnits,
          maxUnits: config.maxUnits,
          maxInspectors: config.maxInspectors,
          trialDays: config.trialDays,
          isCustom: config.isCustom,
          isActive: config.isActive,
          modules: config.modules,
          features: config.features,
          stripeProductId,
          stripePriceId
        } as any
      });
      console.log(`✅ Updated existing tier "${config.name}" successfully.`);
    } else {
      // Create new tier
      let stripeProductId = null;
      let stripePriceId = null;

      if (stripe && !config.isCustom) {
        try {
          const product = await stripe.products.create({
            name: `${config.name} Subscription`,
            description: config.description,
          });
          stripeProductId = product.id;

          const priceObj = await stripe.prices.create({
            product: product.id,
            unit_amount: Math.round(config.price * 100),
            currency: "usd",
            recurring: { interval: "month" },
          });
          stripePriceId = priceObj.id;
        } catch (e: any) {
          console.warn(`⚠️ Failed to create Stripe product/price for new "${config.name}":`, e.message);
        }
      }

      const created = await prisma.pricingTier.create({
        data: {
          name: config.name,
          description: config.description,
          price: config.price,
          minUnits: config.minUnits,
          maxUnits: config.maxUnits,
          maxInspectors: config.maxInspectors,
          trialDays: config.trialDays,
          isCustom: config.isCustom,
          isActive: config.isActive,
          modules: config.modules,
          features: config.features,
          stripeProductId,
          stripePriceId
        } as any
      });
      console.log(`✅ Created brand new tier "${config.name}" (ID: ${created.id}).`);
    }
  }

  console.log("🎉 Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
