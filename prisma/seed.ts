import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { cohortSeed, ipSeed } from "./seed-data";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const WEEKS = ["W1", "W2", "W3", "W4"] as const;

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

async function main() {
  console.log("Seeding cohorts + clients...");
  for (const c of cohortSeed) {
    const cohort = await prisma.cohort.upsert({
      where: { code: c.code },
      update: { leaderName: c.leaderName },
      create: { code: c.code, leaderName: c.leaderName },
    });
    for (const clientName of c.clients) {
      await prisma.client.upsert({
        where: { cohortId_name: { cohortId: cohort.id, name: clientName } },
        update: {},
        create: { name: clientName, cohortId: cohort.id },
      });
    }
  }

  console.log("Seeding IPs + roster...");
  for (const ip of ipSeed) {
    const record = await prisma.ip.upsert({
      where: { name: ip.name },
      update: { defaultWeeklyTarget: ip.defaultWeeklyTarget },
      create: { name: ip.name, defaultWeeklyTarget: ip.defaultWeeklyTarget },
    });

    const roleAssignments: { name: string; role: "IP_CS" | "DESIGNER" | "EDITOR" }[] = [
      { name: ip.ipcs, role: "IP_CS" },
      { name: ip.designer, role: "DESIGNER" },
      ...ip.editors.map((name) => ({ name, role: "EDITOR" as const })),
    ];

    for (const a of roleAssignments) {
      const person = await prisma.person.upsert({
        where: { name: a.name },
        update: {},
        create: { name: a.name },
      });
      await prisma.personAssignment.upsert({
        where: { personId_ipId_role: { personId: person.id, ipId: record.id, role: a.role } },
        update: {},
        create: { personId: person.id, ipId: record.id, role: a.role },
      });
    }
  }

  console.log("Seeding client x IP status matrix (all Pending)...");
  const clients = await prisma.client.findMany();
  const ips = await prisma.ip.findMany();
  for (const client of clients) {
    for (const ip of ips) {
      await prisma.clientIpStatus.upsert({
        where: { clientId_ipId: { clientId: client.id, ipId: ip.id } },
        update: {},
        create: { clientId: client.id, ipId: ip.id, status: "PENDING" },
      });
    }
  }

  console.log("Seeding current rotation cycle (assignments left blank - populate via UI)...");
  const monthKey = currentMonthKey();
  const cycle = await prisma.rotationCycle.upsert({
    where: { monthKey },
    update: {},
    create: { monthKey },
  });
  for (const ip of ips) {
    for (const week of WEEKS) {
      await prisma.rotationEntry.upsert({
        where: { cycleId_ipId_week: { cycleId: cycle.id, ipId: ip.id, week } },
        update: {},
        create: { cycleId: cycle.id, ipId: ip.id, week, target: ip.defaultWeeklyTarget, achieved: 0 },
      });
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
