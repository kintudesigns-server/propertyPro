import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PROPERTY_IMAGES_MAP: Record<string, string[]> = {
  "Grand Horizon Towers": [
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200",
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200",
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200",
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200",
  ],
  "Sunset Villa": [
    "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200",
    "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200",
    "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1200",
  ],
  "Move-Out Sandbox Estates": [
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200",
    "https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=1200",
    "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200",
    "https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?w=1200",
  ],
  "Pacific Commerce Center": [
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200",
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200",
    "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1200",
    "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1200",
  ],
  "Patel Family Home": [
    "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200",
    "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=1200",
    "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200",
    "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=1200",
    "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200",
  ],
  "Patel Silicon Valley Condos": [
    "https://images.unsplash.com/photo-1567496898669-ee935f5f647a?w=1200",
    "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=1200",
    "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=1200",
    "https://images.unsplash.com/photo-1512915922686-57c11dde9b6b?w=1200",
    "https://images.unsplash.com/photo-1540518614846-7ede433c517a?w=1200",
  ],
  "Carter Square": [
    "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=1200",
    "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200",
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200",
    "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200",
    "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200",
  ],
  "Carter Heights": [
    "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200",
    "https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?w=1200",
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200",
    "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200",
    "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=1200",
  ],
  "Impending Plaza": [
    "https://images.unsplash.com/photo-1460317442991-0ec209397118?w=1200",
    "https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=1200",
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200",
  ],
};

const DEFAULT_APARTMENT_IMAGES = [
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200",
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200",
  "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200",
];

const DEFAULT_HOUSE_IMAGES = [
  "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200",
  "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200",
  "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1200",
];

async function main() {
  console.log("📸 Updating database properties with 5 distinct images each...");

  const properties = await prisma.property.findMany({
    include: { units: true }
  });

  for (const property of properties) {
    let images = PROPERTY_IMAGES_MAP[property.name];

    if (!images) {
      if (property.type === "House") {
        images = DEFAULT_HOUSE_IMAGES;
      } else {
        images = DEFAULT_APARTMENT_IMAGES;
      }
    }

    // Ensure cover photo is set
    const coverPhoto = property.coverPhoto || images[0];

    await prisma.property.update({
      where: { id: property.id },
      data: {
        coverPhoto,
        images,
      },
    });

    console.log(`Updated property: "${property.name}" with ${images.length} images.`);
  }

  console.log("✅ All properties successfully updated with multiple high-quality images!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
