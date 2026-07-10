import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

const ENCRYPTION_KEY = (() => {
  const keyStr = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || "default-fallback-secret-propertypro-32-chars";
  return crypto.scryptSync(keyStr, "propertypro-salt", 32);
})();

function encrypt(text: string): string {
  if (!text) return "";
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag.toString()}:${encrypted}`;
}

function isEncrypted(text: string): boolean {
  if (!text) return true; // Empty is considered safe
  return text.split(":").length === 3;
}

async function main() {
  console.log("Starting legacy data encryption migration...");

  // 1. Users
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { ssn: { not: null } },
        { accountNumber: { not: null } }
      ]
    }
  });

  console.log(`Found ${users.length} users with potential sensitive data.`);
  let usersUpdated = 0;

  for (const user of users) {
    const updateData: any = {};
    if (user.ssn && !isEncrypted(user.ssn)) {
      updateData.ssn = encrypt(user.ssn);
    }
    if (user.accountNumber && !isEncrypted(user.accountNumber)) {
      updateData.accountNumber = encrypt(user.accountNumber);
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: updateData
      });
      usersUpdated++;
    }
  }
  console.log(`Successfully encrypted legacy data for ${usersUpdated} users.`);

  // 2. External Vendors
  const vendors = await prisma.externalVendor.findMany({
    where: {
      OR: [
        { routingNumber: { not: null } },
        { accountNumber: { not: null } }
      ]
    }
  });

  console.log(`Found ${vendors.length} external vendors with potential sensitive data.`);
  let vendorsUpdated = 0;

  for (const vendor of vendors) {
    const updateData: any = {};
    if (vendor.routingNumber && !isEncrypted(vendor.routingNumber)) {
      updateData.routingNumber = encrypt(vendor.routingNumber);
    }
    if (vendor.accountNumber && !isEncrypted(vendor.accountNumber)) {
      updateData.accountNumber = encrypt(vendor.accountNumber);
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.externalVendor.update({
        where: { id: vendor.id },
        data: updateData
      });
      vendorsUpdated++;
    }
  }
  console.log(`Successfully encrypted legacy data for ${vendorsUpdated} vendors.`);
  console.log("Migration complete!");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
