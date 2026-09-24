import { prisma } from "@/lib/prisma";
import { WEEKS, type WeekKey } from "@/lib/dates";
import { StatusState } from "@/generated/prisma/enums";

/**
 * A month's rotation cycle. New months repeat the most recent month's
 * W1–W4 cohort pattern (the schedule is the same every month), with each
 * IP's current weekly target.
 */
export async function getOrCreateCycle(monthKey: string) {
  const existing = await prisma.rotationCycle.findUnique({ where: { monthKey } });
  if (existing) return existing;

  const [ips, previous] = await Promise.all([
    prisma.ip.findMany(),
    prisma.rotationCycle.findFirst({
      where: { monthKey: { lt: monthKey } },
      orderBy: { monthKey: "desc" },
      include: { entries: { include: { assignments: true } } },
    }),
  ]);

  try {
    return await prisma.rotationCycle.create({
      data: {
        monthKey,
        entries: {
          create: ips.flatMap((ip) =>
            WEEKS.map((week) => {
              const prior = previous?.entries.find((e) => e.ipId === ip.id && e.week === week);
              return {
                ipId: ip.id,
                week,
                target: ip.defaultWeeklyTarget,
                achieved: 0,
                assignments: { create: (prior?.assignments ?? []).map((a) => ({ cohortId: a.cohortId })) },
              };
            }),
          ),
        },
      },
    });
  } catch (e) {
    // Two requests created the same month at once; use the one that won.
    const raced = await prisma.rotationCycle.findUnique({ where: { monthKey } });
    if (raced) return raced;
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
