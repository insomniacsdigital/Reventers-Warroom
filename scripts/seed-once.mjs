// Loads the launch data on deploy. scripts/seed.ts marks the database once
// it has run, so every later deploy is a no-op and never touches edits made
// in the app. Also creates the collection indexes (the unique constraints the
// app relies on). Runs before `next build`.
import "dotenv/config";
import { spawnSync } from "node:child_process";

if (!process.env.MONGODB_URI) {
  console.error("seed-once: MONGODB_URI is not set.");
  process.exit(1);
}

const result = spawnSync("npx", ["tsx", "scripts/seed.ts"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: process.env,
});

process.exit(result.status ?? 1);
