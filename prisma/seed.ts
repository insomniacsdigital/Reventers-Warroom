import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  cohortSeed,
  ipSeed,
  floaterSeed,
  adminSeed,
  adminSetupCodeHashes,
  festivalSeed,
  BASE_MONTHLY_TARGET,
  PER_BRAND_INCREMENT,
} from "./seed-data";

// Loads the launch data exactly once. It runs on every deploy (see
// scripts/seed-once.mjs), but after the first successful run the
// "seed.version" marker makes it a no-op, so edits made in the app are
// never overwritten.
const SEED_VERSION = "2";

function isLocalHost(url: URL): boolean {
  return url.hostname === "localhost" || url.hostname === "127.0.0.1";
}

// See src/lib/prisma.ts for why sslmode has to be stripped rather than
// just passing a sibling `ssl` option.
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

const adapter = new PrismaPg(connectionConfig(process.env.DIRECT_URL || process.env.DATABASE_URL));
const prisma = new PrismaClient({ adapter });

const WEEKS = ["W1", "W2", "W3", "W4"] as const;

function currentMonthKey(): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("year")}-${get("month")}`;
}

async function person(name: string, appRole: "ADMIN" | "COHORT_LEADER" | "IP_CS" | "DESIGNER" | "EDITOR" | "FLOATER") {
  return prisma.person.upsert({ where: { name }, update: {}, create: { name, appRole } });
}

async function main() {
  const marker = await prisma.appSetting.findUnique({ where: { key: "seed.version" } });
  if (marker) {
    console.log(`Launch data already loaded (seed v${marker.value}); nothing to do.`);
    return;
  }

  console.log("Loading settings...");
  for (const [key, value] of [
    ["target.baseMonthly", String(BASE_MONTHLY_TARGET)],
    ["target.perBrand", String(PER_BRAND_INCREMENT)],
  ]) {
    await prisma.appSetting.upsert({ where: { key }, update: {}, create: { key, value } });
  }

  console.log("Loading admins...");
  for (const name of adminSeed) {
    await prisma.person.upsert({
      where: { name },
      update: {},
      create: { name, appRole: "ADMIN", passwordHash: adminSetupCodeHashes[name], mustChangePassword: true },
    });
  }

  console.log("Loading cohorts + brands...");
  for (const c of cohortSeed) {
    const leader = await person(c.leaderName, "COHORT_LEADER");
    const cohort = await prisma.cohort.upsert({
      where: { code: c.code },
      update: { leaderName: c.leaderName, leaderPersonId: leader.id },
      create: { code: c.code, leaderName: c.leaderName, leaderPersonId: leader.id },
    });
    for (const name of c.brands) {
      await prisma.brand.upsert({
        where: { cohortId_name: { cohortId: cohort.id, name } },
        update: {},
        create: { name, cohortId: cohort.id },
      });
    }
  }

  console.log("Loading IPs + teams...");
  for (const [i, ip] of ipSeed.entries()) {
    const record = await prisma.ip.upsert({
      where: { name: ip.name },
      update: { defaultWeeklyTarget: ip.weeklyTarget, sortOrder: i + 1 },
      create: { name: ip.name, defaultWeeklyTarget: ip.weeklyTarget, sortOrder: i + 1 },
    });
    const roles = [
      ...ip.ipcs.map((name) => ({ name, role: "IP_CS" as const })),
      ...ip.designers.map((name) => ({ name, role: "DESIGNER" as const })),
      ...ip.editors.map((name) => ({ name, role: "EDITOR" as const })),
    ];
    for (const r of roles) {
      const p = await person(r.name, r.role);
      await prisma.personAssignment.upsert({
        where: { personId_ipId_role: { personId: p.id, ipId: record.id, role: r.role } },
        update: {},
        create: { personId: p.id, ipId: record.id, role: r.role },
      });
    }
  }
  for (const name of floaterSeed) await person(name, "FLOATER");

  console.log("Loading this month's rotation...");
  const cohorts = await prisma.cohort.findMany();
  const cohortIdByLeader = new Map(cohorts.map((c) => [c.leaderName, c.id]));
  const monthKey = currentMonthKey();
  const cycle = await prisma.rotationCycle.upsert({ where: { monthKey }, update: {}, create: { monthKey } });
  for (const ip of ipSeed) {
    const record = await prisma.ip.findUniqueOrThrow({ where: { name: ip.name } });
    for (const [w, week] of WEEKS.entries()) {
      const entry = await prisma.rotationEntry.upsert({
        where: { cycleId_ipId_week: { cycleId: cycle.id, ipId: record.id, week } },
        update: { target: ip.weeklyTarget },
        create: { cycleId: cycle.id, ipId: record.id, week, target: ip.weeklyTarget },
      });
      for (const leader of ip.rotation[w]) {
        const cohortId = cohortIdByLeader.get(leader);
        if (!cohortId) throw new Error(`Rotation names unknown cohort leader "${leader}"`);
        await prisma.rotationAssignment.upsert({
          where: { entryId_cohortId: { entryId: entry.id, cohortId } },
          update: {},
          create: { entryId: entry.id, cohortId },
        });
      }
    }
  }

  console.log("Loading festivals...");
  if ((await prisma.festival.count()) === 0) {
    await prisma.festival.createMany({
      data: festivalSeed.map(([month, dateLabel, name], i) => ({ month, dateLabel, name, sortOrder: i })),
    });
  }

  await prisma.appSetting.create({ data: { key: "seed.version", value: SEED_VERSION } });
  console.log("Launch data loaded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
