"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { StatusState, AttendanceStatus } from "@/generated/prisma/enums";
import { getOrCreateCycle } from "@/lib/rotation";
import type { WeekKey } from "@/lib/dates";

const STATUS_CYCLE: Record<StatusState, StatusState> = {
  PENDING: StatusState.PARTIAL,
  PARTIAL: StatusState.DONE,
  DONE: StatusState.PENDING,
};

function revalidateProductionPaths() {
  revalidatePath("/");
  revalidatePath("/matrix");
  revalidatePath("/rotation");
  revalidatePath("/cohort-progress");
  revalidatePath("/trends");
}

export async function cycleClientIpStatus(clientId: string, ipId: string) {
  const existing = await prisma.clientIpStatus.findUnique({
    where: { clientId_ipId: { clientId, ipId } },
  });
  const current = existing?.status ?? StatusState.PENDING;
  const next = STATUS_CYCLE[current];
  await prisma.clientIpStatus.upsert({
    where: { clientId_ipId: { clientId, ipId } },
    update: { status: next },
    create: { clientId, ipId, status: next },
  });
  revalidateProductionPaths();
}

export async function resetClientIpStatuses() {
  await prisma.clientIpStatus.updateMany({ data: { status: StatusState.PENDING } });
  revalidateProductionPaths();
}

async function getEntry(monthKey: string, ipId: string, week: WeekKey) {
  const cycle = await getOrCreateCycle(monthKey);
  return prisma.rotationEntry.findUniqueOrThrow({
    where: { cycleId_ipId_week: { cycleId: cycle.id, ipId, week } },
  });
}

export async function setRotationTarget(monthKey: string, ipId: string, week: WeekKey, target: number) {
  const entry = await getEntry(monthKey, ipId, week);
  await prisma.rotationEntry.update({ where: { id: entry.id }, data: { target: Math.max(0, target) } });
  revalidateProductionPaths();
}

export async function setRotationAchieved(monthKey: string, ipId: string, week: WeekKey, achieved: number) {
  const entry = await getEntry(monthKey, ipId, week);
  await prisma.rotationEntry.update({ where: { id: entry.id }, data: { achieved: Math.max(0, achieved) } });
  revalidateProductionPaths();
}

export async function toggleRotationCohort(monthKey: string, ipId: string, week: WeekKey, cohortId: string) {
  const entry = await getEntry(monthKey, ipId, week);
  const existing = await prisma.rotationAssignment.findUnique({
    where: { entryId_cohortId: { entryId: entry.id, cohortId } },
  });
  if (existing) {
    await prisma.rotationAssignment.delete({ where: { id: existing.id } });
  } else {
    await prisma.rotationAssignment.create({ data: { entryId: entry.id, cohortId } });
  }
  revalidateProductionPaths();
}

export async function submitTrade(input: {
  monthKey: string;
  ipId: string;
  week: WeekKey;
  releasedCohortId: string;
  claimedCohortId: string;
  note?: string;
}) {
  const cycle = await getOrCreateCycle(input.monthKey);
  await prisma.trade.create({
    data: {
      cycleId: cycle.id,
      ipId: input.ipId,
      week: input.week,
      releasedCohortId: input.releasedCohortId,
      claimedCohortId: input.claimedCohortId,
      note: input.note?.trim() || null,
    },
  });
  revalidateProductionPaths();
}

export async function deleteTrade(tradeId: string) {
  await prisma.trade.delete({ where: { id: tradeId } });
  revalidateProductionPaths();
}

export async function cycleCohortWeeklyStatus(monthKey: string, cohortId: string, ipId: string, week: WeekKey) {
  const cycle = await getOrCreateCycle(monthKey);
  const existing = await prisma.cohortWeeklyStatus.findUnique({
    where: { cycleId_cohortId_ipId_week: { cycleId: cycle.id, cohortId, ipId, week } },
  });
  const current = existing?.status ?? StatusState.PENDING;
  const next = STATUS_CYCLE[current];
  await prisma.cohortWeeklyStatus.upsert({
    where: { cycleId_cohortId_ipId_week: { cycleId: cycle.id, cohortId, ipId, week } },
    update: { status: next },
    create: { cycleId: cycle.id, cohortId, ipId, week, status: next },
  });
  revalidateProductionPaths();
}

export async function setAttendance(personId: string, dateStr: string, status: AttendanceStatus | null) {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  if (status === null) {
    await prisma.attendanceRecord.deleteMany({ where: { personId, date } });
  } else {
    await prisma.attendanceRecord.upsert({
      where: { personId_date: { personId, date } },
      update: { status },
      create: { personId, date, status },
    });
  }
  revalidatePath("/attendance");
  revalidatePath("/trends");
}
