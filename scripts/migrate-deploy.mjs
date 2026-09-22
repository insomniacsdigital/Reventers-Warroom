// Runs `prisma migrate deploy` against an unpooled connection when one is
// available (DIRECT_URL), falling back to DATABASE_URL otherwise.
//
// Pooled providers (Neon, Supabase, PgBouncer) want the app to use a pooled
// DATABASE_URL at runtime but migrations to run over a direct connection —
// PgBouncer's transaction-mode pooling doesn't reliably support Prisma's
// migration advisory locks. A plain (unpooled) Postgres instance doesn't
// need DIRECT_URL at all; this just falls back to DATABASE_URL for those.
//
// This has to be a real Node process rather than a shell one-liner in
// package.json, because DIRECT_URL/DATABASE_URL may only exist in a local
// .env file (loaded here via dotenv) rather than the shell's own
// environment — a `${DIRECT_URL:-$DATABASE_URL}` shell expansion would see
// neither locally, even though it happens to work on hosts (Vercel, etc.)
// that inject env vars directly into the process environment.
import "dotenv/config";
import { spawnSync } from "node:child_process";

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("migrate-deploy: neither DIRECT_URL nor DATABASE_URL is set.");
  process.exit(1);
}

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, DATABASE_URL: url },
});

process.exit(result.status ?? 1);
