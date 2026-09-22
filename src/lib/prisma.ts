import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function isLocalHost(connectionString: string | undefined): boolean {
  if (!connectionString) return true;
  try {
    const { hostname } = new URL(connectionString);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return true;
  }
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  const adapter = new PrismaPg({
    connectionString,
    // Hosted poolers (Supabase, Neon, ...) present a certificate chain
    // Node's default trust store doesn't fully verify, which otherwise
    // fails as "self-signed certificate in certificate chain". Local
    // Postgres has no SSL listener at all, so only relax verification
    // (not encryption) for non-local hosts.
    ...(isLocalHost(connectionString) ? {} : { ssl: { rejectUnauthorized: false } }),
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
