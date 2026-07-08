const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const owner = await prisma.user.findUnique({where: {email: 'owner@example.com'}});
  if (owner) {
    const existing = await prisma.externalVendor.findFirst({ where: { email: 'bob@plumbingpro.com' } });
    if (!existing) {
      await prisma.externalVendor.create({
        data: { name: "Bob's Plumbing Pro", email: 'bob@plumbingpro.com', phone: '555-0123', specialty: 'Plumbing', ownerId: owner.id }
      });
      console.log('Vendor created');
    } else {
      console.log('Vendor already exists');
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
