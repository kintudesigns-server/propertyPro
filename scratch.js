const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const requests = await prisma.maintenanceRequest.findMany({
    where: {
      vendorMagicToken: { not: null }
    },
    select: {
      id: true,
      title: true,
      status: true,
      vendorMagicToken: true
    }
  });
  console.log("Maintenance Requests with Vendor Magic Tokens:");
  console.log(JSON.stringify(requests, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
