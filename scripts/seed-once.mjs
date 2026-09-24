// Loads the launch data on deploy. prisma/seed.ts marks the database once
// it has run, so every later deploy is a no-op and never touches edits made
// in the app. Runs after migrations, before `next build`.
import "dotenv/config";
import { spawnSync } from "node:child_process";

if (!process.env.DIRECT_URL && !process.env.DATABASE_URL) {
  console.error("seed-once: neither DIRECT_URL nor DATABASE_URL is set.");
  process.exit(1);
}

const result = spawnSync("npx", ["tsx", "prisma/seed.ts"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: process.env,
});

process.exit(result.status ?? 1);
