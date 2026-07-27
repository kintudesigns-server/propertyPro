import { PrismaClient } from "@prisma/client";

const createPrismaClient = () => new PrismaClient();

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

// Instantiates a fresh PrismaClient to load updated schema definitions
export const prisma = new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

