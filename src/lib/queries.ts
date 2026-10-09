import { db } from "@/lib/db";
import { AppRole, PersonRole, StatusState, type FestiveFormat } from "@/lib/enums";
import type { Brand, Cohort, Person } from "@/lib/models";
import { WEEKS, currentMonthKey, type WeekKey } from "@/lib/dates";
import { getOrCreateCycle, statusValue, effectiveAssignment } from "@/lib/rotation";
import { summarize } from "@/lib/attendance";

/** Brands that count in a given month (not archived before it). */
function activeIn(monthKey: string) {
  return { $or: [{ archivedMonthKey: null }, { archivedMonthKey: { $gt: monthKey } }] };
}

export async function getKpis() {
  const monthKey = currentMonthKey();
  const [cohorts, brands, ips, people] = await Promise.all([
    db.cohorts.count(),
    db.brands.count(activeIn(monthKey)),
    db.ips.count(),
    db.people.find({ active: true }),
  ]);
  const count = (role: string) => people.filter((p) => p.appRole === role).length;
  return {
    cohorts,
    brands,
    ips,
    ipcs: count("IP_CS"),
    designers: count("DESIGNER"),
    editors: count("EDITOR"),
    floaters: count("FLOATER"),
  };
}

export type CohortWithBrands = Cohort & { brands: Brand[]; leader: Person | null };

export async function getCohorts(monthKey = currentMonthKey()): Promise<CohortWithBrands[]> {
  const [cohorts, brands, people] = await Promise.all([
    db.cohorts.find({}, { sort: { code: 1 } }),
    db.brands.find(activeIn(monthKey), { sort: { name: 1 } }),
    db.people.find(),
  ]);
  const peopleById = new Map(people.map((p) => [p.id, p]));
  return cohorts.map((c) => ({
    ...c,
    brands: brands.filter((b) => b.cohortId === c.id),
    leader: (c.leaderPersonId && peopleById.get(c.leaderPersonId)) || null,
  }));
}

/** Cohorts with all their brands, archived ones included (admin). */
export async function getCohortsWithAllBrands() {
  const [cohorts, brands] = await Promise.all([db.cohorts.find({}, { sort: { code: 1 } }), db.brands.find({}, { sort: { name: 1 } })]);
  return cohorts.map((c) => ({ ...c, brands: brands.filter((b) => b.cohortId === c.id) }));
}

/** People ordered by role (in the order roles are declared), then name. */
function byRoleThenName(people: Person[]) {
  const rank = (p: Person) => Object.values(AppRole).indexOf(p.appRole);
  return people.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

export async function getPeople(opts: { activeOnly?: boolean } = {}) {
  const people = await db.people.find(opts.activeOnly ? { active: true } : {}, { sort: { name: 1 } });
  return opts.activeOnly ? people : byRoleThenName(people);
}

export async function getPerson(id: string) {
  return db.people.get(id);
}

export async function getMonthSettings() {
  return db.monthSettings.find();
}

/** Every IP with its team assignments (admin). */
export async function getIpsWithAssignments() {
  const [ips, assignments, people] = await Promise.all([
    db.ips.find({}, { sort: { sortOrder: 1, name: 1 } }),
    db.personAssignments.find(),
    db.people.find(),
  ]);
  const peopleById = new Map(people.map((p) => [p.id, p]));
  return ips.map((ip) => ({
    ...ip,
    assignments: assignments
      .filter((a) => a.ipId === ip.id && peopleById.has(a.personId))
      .map((a) => ({ ...a, person: peopleById.get(a.personId)! }))
      .sort((a, b) => a.role.localeCompare(b.role)),
  }));
}

/** "C1 · Aasawari" */
export function cohortLabel(c: { code: string; leaderName: string }) {
  return `${c.code} · ${c.leaderName}`;
}

/** Each cohort's IP delivery for the month, from the Brand × IP matrix. */
export async function getCohortOverview(monthKey: string) {
  const [cohorts, cells] = await Promise.all([
    getCohorts(monthKey),
    db.brandIpMonths.find({ monthKey }),
  ]);
  return cohorts.map((cohort) => {
    const brandIds = new Set(cohort.brands.map((b) => b.id));
    const mine = cells.filter((c) => brandIds.has(c.brandId));
    const target = mine.reduce((s, c) => s + c.target, 0);
    const achieved = mine.reduce((s, c) => s + c.achieved, 0);
    const live = mine.reduce((s, c) => s + c.live, 0);
    return {
      id: cohort.id,
      code: cohort.code,
      leaderName: cohort.leaderName,
      brandCount: cohort.brands.length,
      target,
      achieved,
      live,
      pct: target ? Math.min(100, Math.round((achieved / target) * 100)) : 0,
    };
  });
}

/** Every IP with who handles it. */
export async function getIpTeams() {
  const ips = await getIpsWithAssignments();
  return ips.map((ip) => {
    const assigned = [...ip.assignments].sort((x, y) => x.person.name.localeCompare(y.person.name));
    const names = (role: PersonRole) => assigned.filter((a) => a.role === role).map((a) => a.person.name);
    return {
      id: ip.id,
      name: ip.name,
      weeklyTarget: ip.defaultWeeklyTarget,
      ipcs: names(PersonRole.IP_CS),
      designers: names(PersonRole.DESIGNER),
      editors: names(PersonRole.EDITOR),
      personIds: Array.from(new Set(ip.assignments.map((a) => a.personId))),
    };
  });
}

export async function getMatrix(monthKey: string) {
  const [cohorts, ips, cells] = await Promise.all([
    getCohorts(monthKey),
    db.ips.find({}, { sort: { sortOrder: 1, name: 1 } }),
    db.brandIpMonths.find({ monthKey }),
  ]);
  const cellMap = new Map(cells.map((c) => [`${c.brandId}:${c.ipId}`, c]));
  return { cohorts, ips, cellMap };
}

export async function getRotationView(monthKey: string) {
  await getOrCreateCycle(monthKey);
  const [cycleDoc, teams, cohorts, ipMonth] = await Promise.all([
    db.rotationCycles.getOrThrow({ monthKey }),
    getIpTeams(),
    db.cohorts.find({}, { sort: { code: 1 } }),
    db.brandIpMonths.find({ monthKey }),
  ]);
  const [entryDocs, trades] = await Promise.all([db.rotationEntries.find({ cycleId: cycleDoc.id }), db.trades.find({ cycleId: cycleDoc.id })]);
  const assignments = await db.rotationAssignments.find({ entryId: { $in: entryDocs.map((e) => e.id) } });
  const cycle = {
    ...cycleDoc,
    entries: entryDocs.map((e) => ({ ...e, assignments: assignments.filter((a) => a.entryId === e.id) })),
    trades,
  };

  const rows = teams.map((team) => {
    const byWeek = {} as Record<WeekKey, { target: number; cohortIds: string[]; tradeCount: number }>;
    for (const week of WEEKS) {
      const entry = cycle.entries.find((e) => e.ipId === team.id && e.week === week);
      byWeek[week] = {
        target: entry?.target ?? team.weeklyTarget,
        cohortIds: entry?.assignments.map((a) => a.cohortId) ?? [],
        tradeCount: cycle.trades.filter((t) => t.ipId === team.id && t.week === week).length,
      };
    }
    const monthTarget = WEEKS.reduce((s, w) => s + byWeek[w].target, 0);
    const mine = ipMonth.filter((m) => m.ipId === team.id);
    return {
      team,
      byWeek,
      monthTarget,
      achieved: mine.reduce((s, m) => s + m.achieved, 0),
      live: mine.reduce((s, m) => s + m.live, 0),
    };
  });

  return { cycle, rows, cohorts };
}

export async function listCycleMonthKeys() {
  const cycles = await db.rotationCycles.find({}, { sort: { monthKey: 1 } });
  return cycles.map((c) => c.monthKey);
}

export async function getTrades(monthKey: string, ipId?: string) {
  const cycle = await db.rotationCycles.findOne({ monthKey });
  if (!cycle) return [];
  const [trades, ips, cohorts] = await Promise.all([
    db.trades.find({ cycleId: cycle.id, ...(ipId ? { ipId } : {}) }, { sort: { createdAt: -1 } }),
    db.ips.find(),
    db.cohorts.find(),
  ]);
  const ipsById = new Map(ips.map((i) => [i.id, i]));
  const cohortsById = new Map(cohorts.map((c) => [c.id, c]));
  return trades.flatMap((t) => {
    const ip = ipsById.get(t.ipId);
    const releasedCohort = cohortsById.get(t.releasedCohortId);
    const claimedCohort = cohortsById.get(t.claimedCohortId);
    return ip && releasedCohort && claimedCohort ? [{ ...t, ip, releasedCohort, claimedCohort }] : [];
  });
}

export async function getCohortWeeklyView(monthKey: string, cohortId: string, week: WeekKey) {
  const cycle = await getOrCreateCycle(monthKey);
  const [entryDocs, ips, trades, cohortStatuses] = await Promise.all([
    db.rotationEntries.find({ cycleId: cycle.id, week }),
    db.ips.find(),
    db.trades.find({ cycleId: cycle.id, week }),
    db.cohortWeeklyStatuses.find({ cycleId: cycle.id, cohortId, week }),
  ]);
  const assignments = await db.rotationAssignments.find({ entryId: { $in: entryDocs.map((e) => e.id) } });
  const ipsById = new Map(ips.map((i) => [i.id, i]));
  const entries = entryDocs.flatMap((e) => {
    const ip = ipsById.get(e.ipId);
    return ip ? [{ ...e, ip, assignments: assignments.filter((a) => a.entryId === e.id) }] : [];
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

  return assignedEntries
    .sort((a, b) => a.ip.sortOrder - b.ip.sortOrder)
    .map((entry) => {
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
  const [cohorts, entryDocs, trades, cohortStatuses] = await Promise.all([
    db.cohorts.find({}, { sort: { code: 1 } }),
    db.rotationEntries.find({ cycleId: cycle.id }),
    db.trades.find({ cycleId: cycle.id }),
    db.cohortWeeklyStatuses.find({ cycleId: cycle.id }),
  ]);
  const assignments = await db.rotationAssignments.find({ entryId: { $in: entryDocs.map((e) => e.id) } });
  const entries = entryDocs.map((e) => ({ ...e, assignments: assignments.filter((a) => a.entryId === e.id) }));

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

/* ---------------- FESTIVE & NON-IP ---------------- */

export async function getFestivals(includeInactive = false) {
  return db.festivals.find(includeInactive ? {} : { active: true }, { sort: { month: 1, sortOrder: 1 } });
}

export async function getFestiveView(monthKey: string) {
  const [cohorts, festivals, festiveDocs, nonIp] = await Promise.all([
    getCohorts(monthKey),
    getFestivals(),
    db.festiveEntries.find({ monthKey }),
    db.nonIpEntries.find({ monthKey }),
  ]);
  const festivalsById = new Map((await getFestivals(true)).map((f) => [f.id, f]));
  const festive = festiveDocs.flatMap((e) => {
    const festival = festivalsById.get(e.festivalId);
    return festival ? [{ ...e, festival }] : [];
  });

  // Group festive rows as brand + festival, with one cell per format.
  type Cell = { target: number; achieved: number; live: number };
  const groups = new Map<string, { brandId: string; festivalId: string; festivalName: string; dateLabel: string; month: number; formats: Partial<Record<FestiveFormat, Cell>> }>();
  for (const e of festive) {
    const key = `${e.brandId}:${e.festivalId}`;
    if (!groups.has(key)) {
      groups.set(key, {
        brandId: e.brandId,
        festivalId: e.festivalId,
        festivalName: e.festival.name,
        dateLabel: e.festival.dateLabel,
        month: e.festival.month,
        formats: {},
      });
    }
    groups.get(key)!.formats[e.format] = { target: e.target, achieved: e.achieved, live: e.live };
  }

  const byFormat = { STATIC: { target: 0, achieved: 0, live: 0 }, STORY: { target: 0, achieved: 0, live: 0 }, REEL: { target: 0, achieved: 0, live: 0 } };
  const byFestival = new Map<string, { name: string; dateLabel: string; STATIC: number; STORY: number; REEL: number }>();
  for (const e of festive) {
    byFormat[e.format].target += e.target;
    byFormat[e.format].achieved += e.achieved;
    byFormat[e.format].live += e.live;
    if (!byFestival.has(e.festivalId)) byFestival.set(e.festivalId, { name: e.festival.name, dateLabel: e.festival.dateLabel, STATIC: 0, STORY: 0, REEL: 0 });
    byFestival.get(e.festivalId)![e.format] += e.target;
  }
  const nonIpTotal = nonIp.reduce(
    (s, n) => ({ target: s.target + n.target, achieved: s.achieved + n.achieved, live: s.live + n.live }),
    { target: 0, achieved: 0, live: 0 },
  );

  return {
    cohorts,
    festivals,
    festiveGroups: Array.from(groups.values()),
    nonIpByBrand: new Map(nonIp.map((n) => [n.brandId, n])),
    byFormat,
    byFestival: Array.from(byFestival.values()),
    nonIpTotal,
  };
}

/* ---------------- ATTENDANCE ---------------- */

export async function getMyAttendance(personId: string, monthKey: string) {
  const days = await db.attendanceDays.find({ personId, day: { $regex: `^${monthKey}` } }, { sort: { day: -1 } });
  return { days, summary: summarize(monthKey, days) };
}

export async function getOpenDay(personId: string) {
  return db.attendanceDays.findOne({ personId, clockOut: null }, { sort: { day: -1 } });
}

/** Everyone except admins, with their month summary (admin view). */
export async function getAttendanceOverview(monthKey: string) {
  const [people, days] = await Promise.all([
    db.people.find({ active: true, appRole: { $ne: "ADMIN" } }),
    db.attendanceDays.find({ day: { $regex: `^${monthKey}` } }),
  ]);
  return byRoleThenName(people).map((p) => ({ person: p, summary: summarize(monthKey, days.filter((d) => d.personId === p.id)) }));
}

/** Each IP team's average absence rate for the month (IP CS + designers + editors). */
export async function getIpAbsenteeism(monthKey: string) {
  const [teams, overview] = await Promise.all([getIpTeams(), getAttendanceOverview(monthKey)]);
  const rateById = new Map(overview.map((o) => [o.person.id, o.summary]));
  return teams
    .map((t) => {
      const members = t.personIds.map((id) => rateById.get(id)).filter((s): s is NonNullable<typeof s> => Boolean(s));
      const avg = members.length ? Math.round(members.reduce((s, m) => s + m.absenceRate, 0) / members.length) : 0;
      const absentDays = members.reduce((s, m) => s + m.absent, 0);
      return { ip: t, teamSize: members.length, absenceRate: avg, absentDays };
    })
    .sort((a, b) => b.absenceRate - a.absenceRate || b.absentDays - a.absentDays);
}

/* ---------------- TRENDS ---------------- */

/** Month-by-month IP output vs. matrix target, per-cohort completion, and absence rate. */
export async function getTrendsData() {
  const [cells, cohorts, attendance, people, brands] = await Promise.all([
    db.brandIpMonths.find(),
    db.cohorts.find({}, { sort: { code: 1 } }),
    db.attendanceDays.find(),
    db.people.find({ active: true, appRole: { $ne: "ADMIN" } }),
    db.brands.find(),
  ]);
  const cohortByBrand = new Map(brands.map((b) => [b.id, b.cohortId]));

  const monthKeys = Array.from(new Set(cells.map((c) => c.monthKey))).sort();
  const rotationTrend = monthKeys.map((monthKey) => {
    const month = cells.filter((c) => c.monthKey === monthKey);
    const totalTarget = month.reduce((s, c) => s + c.target, 0);
    const totalAchieved = month.reduce((s, c) => s + c.achieved, 0);
    const perCohort: Record<string, number> = {};
    for (const cohort of cohorts) {
      const mine = month.filter((c) => cohortByBrand.get(c.brandId) === cohort.id);
      const t = mine.reduce((s, c) => s + c.target, 0);
      const a = mine.reduce((s, c) => s + c.achieved, 0);
      perCohort[cohort.code] = t ? Math.min(100, Math.round((a / t) * 100)) : 0;
    }
    return {
      monthKey,
      outputPct: totalTarget ? Math.round((totalAchieved / totalTarget) * 100) : 0,
      totalTarget,
      totalAchieved,
      ...perCohort,
    };
  });

  const attendanceMonths = Array.from(new Set(attendance.map((d) => d.day.slice(0, 7)))).sort();
  const attendanceTrend = attendanceMonths.map((monthKey) => {
    const month = attendance.filter((d) => d.day.startsWith(monthKey));
    const rates = people.map((p) => summarize(monthKey, month.filter((d) => d.personId === p.id)).absenceRate);
    const absenceRatePct = rates.length ? Math.round(rates.reduce((s, r) => s + r, 0) / rates.length) : 0;
    return { monthKey, absenceRatePct, present: 0, absent: 0 };
  });

  return { rotationTrend, attendanceTrend, cohortCodes: cohorts.map((c) => c.code) };
}
