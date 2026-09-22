import { prisma } from "@/lib/prisma";
import { WEEKS, type WeekKey } from "@/lib/dates";
import { StatusState } from "@/generated/prisma/enums";

export async function getOrCreateCycle(monthKey: string) {
  const existing = await prisma.rotationCycle.findUnique({ where: { monthKey } });
  if (existing) return existing;

  const ips = await prisma.ip.findMany();
  return prisma.rotationCycle.create({
    data: {
      monthKey,
      entries: {
        create: ips.flatMap((ip) =>
          WEEKS.map((week) => ({
            ipId: ip.id,
            week,
            target: ip.defaultWeeklyTarget,
            achieved: 0,
          })),
        ),
      },
    },
  });
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
