import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function isLocalHost(url: URL): boolean {
  return url.hostname === "localhost" || url.hostname === "127.0.0.1";
}

/**
 * `pg` merges the parsed connection string over any explicit `ssl` option
 * whenever the string itself carries an `sslmode` param (see
 * pg/lib/connection-parameters.js), so a sibling `ssl: {...}` option is
 * silently discarded unless that param is removed first. Hosted poolers
 * (Supabase, Neon, ...) set `sslmode=require`, which this version of `pg`
 * treats as full strict certificate verification — failing against their
 * certificate chain as "self-signed certificate in certificate chain".
 * Stripping the param lets our own relaxed `ssl` option (still encrypted,
 * just not chain-verified) take effect instead.
 */
function connectionConfig(raw: string | undefined) {
  if (!raw) return { connectionString: raw };
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { connectionString: raw };
  }
  if (isLocalHost(url)) return { connectionString: raw };

  url.searchParams.delete("sslmode");
  return { connectionString: url.toString(), ssl: { rejectUnauthorized: false } };
}

function createPrismaClient() {
  const adapter = new PrismaPg(connectionConfig(process.env.DATABASE_URL));
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
