const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Migrating existing pricing tiers with default modules...');
  const tiers = await prisma.pricingTier.findMany();
  console.log(`Found ${tiers.length} pricing tiers.`);

  for (const tier of tiers) {
    let modules = [];
    const price = tier.price;
    const name = (tier.name || '').toLowerCase();
    const isCustom = tier.isCustom;

    if (isCustom || price > 100) {
      // Enterprise/Custom: All 14 modules
      modules = [
        'properties', 'leases', 'tenants', 'applications',
        'maintenance', 'inspections', 'vendors',
        'payments', 'invoices', 'payouts', 'accounting',
        'messages', 'tours', 'documents'
      ];
    } else if (price > 50) {
      // Professional: Core + Operations + Finance (except accounting) + Messages + Tours + Documents
      modules = [
        'properties', 'leases', 'tenants', 'applications',
        'maintenance', 'inspections', 'vendors',
        'payments', 'invoices', 'payouts',
        'messages', 'tours', 'documents'
      ];
    } else if (price > 0) {
      // Starter: Core + Maintenance + Invoices + Tours
      modules = [
        'properties', 'leases', 'tenants', 'applications',
        'payments', 'maintenance', 'invoices', 'tours'
      ];
    } else {
      // Hobbyist / Free: Core modules only
      modules = [
        'properties', 'leases', 'tenants', 'applications',
        'payments'
      ];
    }

    console.log(`Updating tier: "${tier.name}" (Price: $${price}, Custom: ${isCustom}) -> Modules: ${JSON.stringify(modules)}`);
    await prisma.pricingTier.update({
      where: { id: tier.id },
      data: { modules }
    });
  }

  console.log('Migration completed successfully.');
}

main()
  .catch(e => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
