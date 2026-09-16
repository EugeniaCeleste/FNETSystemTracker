import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as typeof globalThis & {
  fnetPrisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient | null {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) return null;
  return new PrismaClient({ adapter: new PrismaPg(connectionString) });
}

export const prisma = globalForPrisma.fnetPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production" && prisma) {
  globalForPrisma.fnetPrisma = prisma;
}

export function getPrismaClient(): PrismaClient {
  if (!prisma) throw new Error("DATABASE_URL is not configured");
  return prisma;
}
