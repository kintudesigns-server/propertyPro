const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.findUnique({
      where: { id: 'ac316a89-1d02-410f-a8d0-8a48358cb064' },
      include: {
        pricingTier: true,
        subscriptionOverride: true,
        ownedProperties: {
          include: { units: true }
        }
      }
    });
    console.log(user ? 'Found user' : 'User not found');
  } catch (err) {
    console.error("Error:", err.message);
  }
}

main().finally(() => prisma.$disconnect());
