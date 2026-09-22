import { prisma } from "@/lib/prisma";
import { PersonRole, StatusState } from "@/generated/prisma/enums";
import { WEEKS, type WeekKey } from "@/lib/dates";
import { getOrCreateCycle, statusValue, effectiveAssignment } from "@/lib/rotation";

export async function getKpis() {
  const [cohorts, clients, ips, ipcsPeople, designerPeople, editorPeople] = await Promise.all([
    prisma.cohort.count(),
    prisma.client.count(),
    prisma.ip.count(),
    prisma.personAssignment.findMany({ where: { role: PersonRole.IP_CS }, select: { personId: true }, distinct: ["personId"] }),
    prisma.personAssignment.findMany({ where: { role: PersonRole.DESIGNER }, select: { personId: true }, distinct: ["personId"] }),
    prisma.personAssignment.findMany({ where: { role: PersonRole.EDITOR }, select: { personId: true }, distinct: ["personId"] }),
  ]);
  return {
    cohorts,
    clients,
    ips,
    ipcs: ipcsPeople.length,
    designers: designerPeople.length,
    editors: editorPeople.length,
  };
}

export async function getCohorts() {
  return prisma.cohort.findMany({ orderBy: { code: "asc" }, include: { clients: true } });
}

export async function getCohortOverview() {
  const cohorts = await getCohorts();
  const ipCount = await prisma.ip.count();
  const statuses = await prisma.clientIpStatus.findMany({
    include: { client: true },
  });
  return cohorts.map((cohort) => {
    const clientIds = new Set(cohort.clients.map((c) => c.id));
    const relevant = statuses.filter((s) => clientIds.has(s.clientId));
    const total = cohort.clients.length * ipCount;
    const done = relevant.filter((s) => s.status === StatusState.DONE).length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return {
      id: cohort.id,
      code: cohort.code,
      leaderName: cohort.leaderName,
      clientCount: cohort.clients.length,
      done,
      total,
      pct,
    };
  });
}

export async function getIpsWithRoster() {
  const ips = await prisma.ip.findMany({
    orderBy: { name: "asc" },
    include: { assignments: { include: { person: true } } },
  });
  return ips.map((ip) => ({
    id: ip.id,
    name: ip.name,
    defaultWeeklyTarget: ip.defaultWeeklyTarget,
    ipcs: ip.assignments.find((a) => a.role === PersonRole.IP_CS)?.person.name ?? "—",
    designer: ip.assignments.find((a) => a.role === PersonRole.DESIGNER)?.person.name ?? "—",
    editors: ip.assignments.filter((a) => a.role === PersonRole.EDITOR).map((a) => a.person.name),
  }));
}

export async function getIpcsGroups() {
  const ips = await getIpsWithRoster();
  const byIpcs = new Map<string, string[]>();
  for (const ip of ips) {
    if (!byIpcs.has(ip.ipcs)) byIpcs.set(ip.ipcs, []);
    byIpcs.get(ip.ipcs)!.push(ip.name);
  }
  return Array.from(byIpcs.entries()).map(([ipcs, ipNames]) => ({ ipcs, ipNames }));
}

export async function getClientMatrix() {
  const cohorts = await prisma.cohort.findMany({
    orderBy: { code: "asc" },
    include: {
      clients: {
        orderBy: { name: "asc" },
        include: { statuses: true },
      },
    },
  });
  const ips = await prisma.ip.findMany({ orderBy: { name: "asc" } });
  return { cohorts, ips };
}

export async function getRotationView(monthKey: string) {
  await getOrCreateCycle(monthKey);
  const cycle = await prisma.rotationCycle.findUniqueOrThrow({
    where: { monthKey },
    include: {
      entries: {
        include: { ip: true, assignments: { include: { cohort: true } } },
      },
      trades: true,
    },
  });
  const ips = await prisma.ip.findMany({ orderBy: { name: "asc" } });
  const cohorts = await prisma.cohort.findMany({ orderBy: { code: "asc" } });

  const rows = ips.map((ip) => {
    const byWeek: Record<WeekKey, { target: number; achieved: number; assignedCohortCodes: string[]; tradeCount: number }> =
      {} as Record<WeekKey, { target: number; achieved: number; assignedCohortCodes: string[]; tradeCount: number }>;
    for (const week of WEEKS) {
      const entry = cycle.entries.find((e) => e.ipId === ip.id && e.week === week);
      byWeek[week] = {
        target: entry?.target ?? ip.defaultWeeklyTarget,
        achieved: entry?.achieved ?? 0,
        assignedCohortCodes: entry?.assignments.map((a) => a.cohort.code) ?? [],
        tradeCount: cycle.trades.filter((t) => t.ipId === ip.id && t.week === week).length,
      };
    }
    return { ip, byWeek };
  });

  return { cycle, rows, cohorts };
}

export async function listCycleMonthKeys() {
  const cycles = await prisma.rotationCycle.findMany({ orderBy: { monthKey: "asc" }, select: { monthKey: true } });
  return cycles.map((c) => c.monthKey);
}

export async function getTrades(monthKey: string, ipId?: string) {
  const cycle = await prisma.rotationCycle.findUnique({ where: { monthKey } });
  if (!cycle) return [];
  return prisma.trade.findMany({
    where: { cycleId: cycle.id, ...(ipId ? { ipId } : {}) },
    include: { ip: true, releasedCohort: true, claimedCohort: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCohortWeeklyView(monthKey: string, cohortId: string, week: WeekKey) {
  const cycle = await getOrCreateCycle(monthKey);
  const entries = await prisma.rotationEntry.findMany({
    where: { cycleId: cycle.id, week },
    include: { ip: true, assignments: true },
  });
  const trades = await prisma.trade.findMany({ where: { cycleId: cycle.id, week } });
  const cohortStatuses = await prisma.cohortWeeklyStatus.findMany({
    where: { cycleId: cycle.id, cohortId, week },
  });

  const assignedEntries = entries.filter((entry) =>
    effectiveAssignment(
      entry.ipId,
      week,
      cohortId,
      entry.assignments.map((a) => a.cohortId),
      trades,
    ),
  );

  return assignedEntries.map((entry) => {
    const status = cohortStatuses.find((s) => s.ipId === entry.ipId)?.status ?? StatusState.PENDING;
    return {
      ipId: entry.ipId,
      ipName: entry.ip.name,
      target: entry.target,
      status,
    };
  });
}

export async function getCohortMonthlySummary(monthKey: string) {
  const cycle = await getOrCreateCycle(monthKey);
  const cohorts = await prisma.cohort.findMany({ orderBy: { code: "asc" } });
  const entries = await prisma.rotationEntry.findMany({
    where: { cycleId: cycle.id },
    include: { assignments: true },
  });
  const trades = await prisma.trade.findMany({ where: { cycleId: cycle.id } });
  const cohortStatuses = await prisma.cohortWeeklyStatus.findMany({ where: { cycleId: cycle.id } });

  return cohorts.map((cohort) => {
    let target = 0;
    let achieved = 0;
    for (const entry of entries) {
      const assigned = effectiveAssignment(
        entry.ipId,
        entry.week as WeekKey,
        cohort.id,
        entry.assignments.map((a) => a.cohortId),
        trades,
      );
      if (!assigned) continue;
      target += 1;
      const status = cohortStatuses.find(
        (s) => s.ipId === entry.ipId && s.week === entry.week && s.cohortId === cohort.id,
      )?.status;
      achieved += status ? statusValue(status) : 0;
    }
    const pct = target ? Math.round((achieved / target) * 100) : 0;
    return { cohort, target, achieved, pct };
  });
}

export async function buildRoster() {
  const assignments = await prisma.personAssignment.findMany({
    include: { person: true, ip: true },
    orderBy: [{ ip: { name: "asc" } }, { role: "asc" }],
  });
  return assignments.map((a) => ({
    ipName: a.ip.name,
    role: a.role,
    personId: a.personId,
    personName: a.person.name,
  }));
}

export async function getAttendanceView(dateStr: string) {
  const roster = await buildRoster();
  const monthPrefix = dateStr.slice(0, 7);
  const uniquePersonIds = Array.from(new Set(roster.map((r) => r.personId)));

  const records = await prisma.attendanceRecord.findMany({
    where: { personId: { in: uniquePersonIds } },
  });

  const dayKey = (d: Date) => d.toISOString().slice(0, 10);

  return roster.map((r) => {
    const todays = records.find((rec) => rec.personId === r.personId && dayKey(rec.date) === dateStr);
    const absences = records.filter(
      (rec) => rec.personId === r.personId && dayKey(rec.date).startsWith(monthPrefix) && rec.status === "ABSENT",
    ).length;
    return {
      ...r,
      status: todays?.status ?? null,
      absencesThisMonth: absences,
    };
  });
}

export async function getTrendsData() {
  const cycles = await prisma.rotationCycle.findMany({
    orderBy: { monthKey: "asc" },
    include: {
      entries: { include: { assignments: true } },
      trades: true,
    },
  });
  const cohorts = await prisma.cohort.findMany({ orderBy: { code: "asc" } });

  const rotationTrend = await Promise.all(
    cycles.map(async (cycle) => {
      const totalTarget = cycle.entries.reduce((sum, e) => sum + e.target, 0);
      const totalAchieved = cycle.entries.reduce((sum, e) => sum + e.achieved, 0);

      const cohortStatuses = await prisma.cohortWeeklyStatus.findMany({ where: { cycleId: cycle.id } });
      const perCohort: Record<string, number> = {};
      for (const cohort of cohorts) {
        let target = 0;
        let achieved = 0;
        for (const entry of cycle.entries) {
          const assigned = effectiveAssignment(
            entry.ipId,
            entry.week as WeekKey,
            cohort.id,
            entry.assignments.map((a) => a.cohortId),
            cycle.trades,
          );
          if (!assigned) continue;
          target += 1;
          const status = cohortStatuses.find(
            (s) => s.ipId === entry.ipId && s.week === entry.week && s.cohortId === cohort.id,
          )?.status;
          achieved += status ? statusValue(status) : 0;
        }
        perCohort[cohort.code] = target ? Math.round((achieved / target) * 100) : 0;
      }

      return {
        monthKey: cycle.monthKey,
        outputPct: totalTarget ? Math.round((totalAchieved / totalTarget) * 100) : 0,
        totalTarget,
        totalAchieved,
        ...perCohort,
      };
    }),
  );

  const attendanceRecords = await prisma.attendanceRecord.findMany();
  const byMonth = new Map<string, { present: number; absent: number }>();
  for (const rec of attendanceRecords) {
    const monthKey = rec.date.toISOString().slice(0, 7);
    if (!byMonth.has(monthKey)) byMonth.set(monthKey, { present: 0, absent: 0 });
    const bucket = byMonth.get(monthKey)!;
    if (rec.status === "PRESENT") bucket.present += 1;
    else bucket.absent += 1;
  }
  const attendanceTrend = Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, { present, absent }]) => ({
      monthKey,
      absenceRatePct: present + absent ? Math.round((absent / (present + absent)) * 100) : 0,
      present,
      absent,
    }));

  return { rotationTrend, attendanceTrend, cohortCodes: cohorts.map((c) => c.code) };
}
