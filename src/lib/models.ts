import type { AppRole, FestiveFormat, PersonRole, StatusState, Week } from "@/lib/enums";

// Document shapes. Every document has a string `id` (stored as `_id`).

export interface Cohort {
  id: string;
  code: string;
  leaderName: string;
  leaderPersonId: string | null;
  createdAt: Date;
}

/** A brand (client). */
export interface Brand {
  id: string;
  name: string;
  cohortId: string;
  /** Month the brand was added after launch ("2026-10"); null for the launch roster. */
  addedMonthKey: string | null;
  /** Month from which the brand no longer counts (null = active). */
  archivedMonthKey: string | null;
}

export interface Ip {
  id: string;
  name: string;
  defaultWeeklyTarget: number;
  sortOrder: number;
}

export interface Person {
  id: string;
  name: string;
  appRole: AppRole;
  email: string | null;
  passwordHash: string | null;
  mustChangePassword: boolean;
  active: boolean;
  createdAt: Date;
}

export interface Session {
  id: string;
  tokenHash: string;
  personId: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface PersonAssignment {
  id: string;
  personId: string;
  ipId: string;
  role: PersonRole;
}

/** Brand x IP numbers for one month. Achieved here is the source of truth for IP output. */
export interface BrandIpMonth {
  id: string;
  monthKey: string;
  brandId: string;
  ipId: string;
  target: number;
  achieved: number;
  live: number;
  updatedAt: Date;
}

/** Admin overrides for one month: a different IP base target, or the achieved total. */
export interface MonthSetting {
  id: string;
  monthKey: string;
  baseOverride: number | null;
  achievedOverride: number | null;
}

/** Key/value settings (IP monthly base, per-brand increment, seed markers). */
export interface AppSetting {
  id: string;
  key: string;
  value: string;
}

export interface Festival {
  id: string;
  name: string;
  month: number;
  dateLabel: string;
  sortOrder: number;
  active: boolean;
}

export interface FestiveEntry {
  id: string;
  monthKey: string;
  brandId: string;
  festivalId: string;
  format: FestiveFormat;
  target: number;
  achieved: number;
  live: number;
}

export interface NonIpEntry {
  id: string;
  monthKey: string;
  brandId: string;
  target: number;
  achieved: number;
  live: number;
}

/**
 * One monthly rotation cycle (a fresh W1-W4 schedule). Keeping cycles
 * separate is what makes month-over-month trend charts possible.
 */
export interface RotationCycle {
  id: string;
  monthKey: string;
  createdAt: Date;
}

export interface RotationEntry {
  id: string;
  cycleId: string;
  ipId: string;
  week: Week;
  target: number;
  achieved: number;
}

export interface RotationAssignment {
  id: string;
  entryId: string;
  cohortId: string;
}

export interface Trade {
  id: string;
  cycleId: string;
  ipId: string;
  week: Week;
  releasedCohortId: string;
  claimedCohortId: string;
  note: string | null;
  createdAt: Date;
}

/** Per-cohort, per-IP, per-week status within a rotation cycle (Pending / Partial / Done). */
export interface CohortWeeklyStatus {
  id: string;
  cycleId: string;
  cohortId: string;
  ipId: string;
  week: Week;
  status: StatusState;
}

/** One person's working day: clock-in and clock-out times (stored in UTC). */
export interface AttendanceDay {
  id: string;
  personId: string;
  /** The working day in India time, "YYYY-MM-DD". */
  day: string;
  clockIn: Date;
  clockOut: Date | null;
  note: string | null;
}
