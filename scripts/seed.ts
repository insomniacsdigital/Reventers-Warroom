import "dotenv/config";
import { closeDb, db, ensureIndexes } from "../src/lib/db";
import type { AppRole } from "../src/lib/enums";
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

const WEEKS = ["W1", "W2", "W3", "W4"] as const;

/** The admins' chosen passwords (scrypt hashes). */
const ISHIKA_PASSWORD_HASH = "scrypt$6JUy5_1jha5DI6-DUV9XYw$lkmP7_cL-gQufU7KTR1zvlpBHHlBgsMUJxECX8rP8ISMQvOwPifdicn4QvD4A23iKjY6SOMM-jTl1hhqu2oN8w";
const UNNATI_PASSWORD_HASH = "scrypt$2AvLUaCHtJ8__k6uKJ3OpQ$W8JylPnZH3jUHoH9bUePBdj29twNbHbOZD777JHCtohIqHHqjcXCthhN0g_cX1GwEMNu7p2aFvPHpbU1tNU4CA";

function currentMonthKey(): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("year")}-${get("month")}`;
}

async function person(name: string, appRole: AppRole) {
  return db.people.upsert({ name }, {}, { appRole });
}

async function main() {
  await ensureIndexes();
  const marker = await db.appSettings.findOne({ key: "seed.version" });
  if (marker) {
    console.log(`Launch data already loaded (seed v${marker.value}); nothing to do.`);
  } else {
    await loadLaunchData();
  }
  await applyAccountSetup();
}

/**
 * One-time admin logins requested by the admins. Runs once (tracked by its
 * own marker), so a password changed later in the app is never undone.
 */
const ADMIN_LOGINS = [
  { name: "Ishika", email: "ishika@insomniacs.in", passwordHash: ISHIKA_PASSWORD_HASH },
  { name: "Unnati", email: "unatti@insomniacs.in", passwordHash: UNNATI_PASSWORD_HASH },
];

async function applyAccountSetup() {
  const key = "setup.admin-logins.v1";
  if (await db.appSettings.findOne({ key })) return;
  for (const a of ADMIN_LOGINS) {
    const person = await db.people.findOne({ name: a.name });
    if (!person) throw new Error(`Admin ${a.name} not found`);
    await db.people.update(
      { id: person.id },
      { email: a.email, passwordHash: a.passwordHash, mustChangePassword: false, active: true, appRole: "ADMIN" },
    );
    await db.sessions.deleteMany({ personId: person.id });
  }
  await db.appSettings.create({ key, value: new Date().toISOString() });
  console.log("Admin logins set up.");
}

async function loadLaunchData() {

  console.log("Loading settings...");
  for (const [key, value] of [
    ["target.baseMonthly", String(BASE_MONTHLY_TARGET)],
    ["target.perBrand", String(PER_BRAND_INCREMENT)],
  ]) {
    await db.appSettings.upsert({ key }, {}, { value });
  }

  console.log("Loading admins...");
  for (const name of adminSeed) {
    await db.people.upsert({ name }, {}, { appRole: "ADMIN", passwordHash: adminSetupCodeHashes[name], mustChangePassword: true });
  }

  console.log("Loading cohorts + brands...");
  for (const c of cohortSeed) {
    const leader = await person(c.leaderName, "COHORT_LEADER");
    const cohort = await db.cohorts.upsert({ code: c.code }, { leaderName: c.leaderName, leaderPersonId: leader.id });
    for (const name of c.brands) {
      await db.brands.upsert({ cohortId: cohort.id, name }, {});
    }
  }

  console.log("Loading IPs + teams...");
  for (const [i, ip] of ipSeed.entries()) {
    const record = await db.ips.upsert({ name: ip.name }, { defaultWeeklyTarget: ip.weeklyTarget, sortOrder: i + 1 });
    const roles = [
      ...ip.ipcs.map((name) => ({ name, role: "IP_CS" as const })),
      ...ip.designers.map((name) => ({ name, role: "DESIGNER" as const })),
      ...ip.editors.map((name) => ({ name, role: "EDITOR" as const })),
    ];
    for (const r of roles) {
      const p = await person(r.name, r.role);
      await db.personAssignments.upsert({ personId: p.id, ipId: record.id, role: r.role }, {});
    }
  }
  for (const name of floaterSeed) await person(name, "FLOATER");

  console.log("Loading this month's rotation...");
  const cohorts = await db.cohorts.find();
  const cohortIdByLeader = new Map(cohorts.map((c) => [c.leaderName, c.id]));
  const monthKey = currentMonthKey();
  const cycle = await db.rotationCycles.upsert({ monthKey }, {});
  for (const ip of ipSeed) {
    const record = await db.ips.getOrThrow({ name: ip.name });
    for (const [w, week] of WEEKS.entries()) {
      const entry = await db.rotationEntries.upsert({ cycleId: cycle.id, ipId: record.id, week }, { target: ip.weeklyTarget });
      for (const leader of ip.rotation[w]) {
        const cohortId = cohortIdByLeader.get(leader);
        if (!cohortId) throw new Error(`Rotation names unknown cohort leader "${leader}"`);
        await db.rotationAssignments.upsert({ entryId: entry.id, cohortId }, {});
      }
    }
  }

  console.log("Loading festivals...");
  if ((await db.festivals.count()) === 0) {
    await db.festivals.createMany(festivalSeed.map(([month, dateLabel, name], i) => ({ month, dateLabel, name, sortOrder: i })));
  }

  await db.appSettings.create({ key: "seed.version", value: SEED_VERSION });
  console.log("Launch data loaded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await closeDb();
  });
