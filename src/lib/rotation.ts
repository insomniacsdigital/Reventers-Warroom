import { db, isDuplicateKey, newId } from "@/lib/db";
import { WEEKS, type WeekKey } from "@/lib/dates";
import { StatusState } from "@/lib/enums";
import type { RotationCycle } from "@/lib/models";

/**
 * A month's rotation cycle. New months repeat the most recent month's
 * W1–W4 cohort pattern (the schedule is the same every month), with each
 * IP's current weekly target.
 */
export async function getOrCreateCycle(monthKey: string): Promise<RotationCycle> {
  const existing = await db.rotationCycles.findOne({ monthKey });
  if (existing) return existing;

  const [ips, previous] = await Promise.all([
    db.ips.find(),
    db.rotationCycles.findOne({ monthKey: { $lt: monthKey } }, { sort: { monthKey: -1 } }),
  ]);
  const priorEntries = previous ? await db.rotationEntries.find({ cycleId: previous.id }) : [];
  const priorAssignments = priorEntries.length
    ? await db.rotationAssignments.find({ entryId: { $in: priorEntries.map((e) => e.id) } })
    : [];

  // The cycle document is written last, so anyone who can see the cycle also sees its entries.
  const cycleId = newId();
  const entries = ips.flatMap((ip) =>
    WEEKS.map((week) => ({ id: newId(), cycleId, ipId: ip.id, week, target: ip.defaultWeeklyTarget, achieved: 0 })),
  );
  const assignments = entries.flatMap((entry) => {
    const prior = priorEntries.find((e) => e.ipId === entry.ipId && e.week === entry.week);
    return priorAssignments.filter((a) => a.entryId === prior?.id).map((a) => ({ entryId: entry.id, cohortId: a.cohortId }));
  });

  await db.rotationEntries.createMany(
    entries.map((e) => ({ cycleId: e.cycleId, ipId: e.ipId, week: e.week, target: e.target, achieved: e.achieved })),
    entries.map((e) => e.id),
  );
  await db.rotationAssignments.createMany(assignments);
  try {
    return await db.rotationCycles.create({ monthKey }, cycleId);
  } catch (e) {
    // Two requests created the same month at once; drop our copy and use the one that won.
    await Promise.all([
      db.rotationAssignments.deleteMany({ entryId: { $in: entries.map((x) => x.id) } }),
      db.rotationEntries.deleteMany({ cycleId }),
    ]);
    const raced = await db.rotationCycles.findOne({ monthKey });
    if (raced && isDuplicateKey(e)) return raced;
    throw e;
  }
}

export function statusValue(status: StatusState): number {
  if (status === StatusState.DONE) return 1;
  if (status === StatusState.PARTIAL) return 0.5;
  return 0;
}

/** A cohort's effective IP assignment for a given week, net of that week's trades. */
export function effectiveAssignment(
  ipId: string,
  week: WeekKey,
  cohortId: string,
  baseAssignedCohortIds: string[],
  trades: { ipId: string; week: string; releasedCohortId: string; claimedCohortId: string }[],
): boolean {
  const baseAssigned = baseAssignedCohortIds.includes(cohortId);
  const releasedByThisCohort = trades.some(
    (t) => t.ipId === ipId && t.week === week && t.releasedCohortId === cohortId,
  );
  const claimedByThisCohort = trades.some(
    (t) => t.ipId === ipId && t.week === week && t.claimedCohortId === cohortId,
  );
  return (baseAssigned && !releasedByThisCohort) || claimedByThisCohort;
}

/** Pending / Partial / Done from achieved vs. target. */
export function statusFrom(target: number, achieved: number): StatusState {
  if (achieved <= 0) return StatusState.PENDING;
  if (target > 0 && achieved >= target) return StatusState.DONE;
  return StatusState.PARTIAL;
}
