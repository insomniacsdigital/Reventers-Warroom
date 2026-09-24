import { currentMonthKey, daysInMonth, todayDateStr } from "@/lib/dates";

/** Standard month length for attendance, per the team's rule. */
export const STANDARD_MONTH_DAYS = 30;
export const FULL_DAY_HOURS = 8;

export type DayStatus = "present" | "half" | "open" | "missing-out";

export function hoursWorked(clockIn: Date, clockOut: Date | null): number | null {
  if (!clockOut) return null;
  return Math.max(0, (clockOut.getTime() - clockIn.getTime()) / 3600_000);
}

/** 8+ hours is present, anything less a half day. No clock-out: still open today, missing on a past day. */
export function dayStatus(day: string, clockIn: Date, clockOut: Date | null): DayStatus {
  const hours = hoursWorked(clockIn, clockOut);
  if (hours === null) return day === todayDateStr() ? "open" : "missing-out";
  return hours >= FULL_DAY_HOURS ? "present" : "half";
}

/** Days the month is measured against: 30, or the days so far if it's the current month. */
export function monthDenominator(monthKey: string): number {
  if (monthKey === currentMonthKey()) return Math.min(STANDARD_MONTH_DAYS, Number(todayDateStr().slice(8, 10)));
  if (monthKey > currentMonthKey()) return 0;
  return Math.min(STANDARD_MONTH_DAYS, daysInMonth(monthKey));
}

export function summarize(monthKey: string, days: { day: string; clockIn: Date; clockOut: Date | null }[]) {
  let present = 0;
  let half = 0;
  let missingOut = 0;
  let open = 0;
  let hours = 0;
  for (const d of days) {
    const status = dayStatus(d.day, d.clockIn, d.clockOut);
    if (status === "present") present += 1;
    else if (status === "half") half += 1;
    else if (status === "missing-out") missingOut += 1;
    else open += 1;
    hours += hoursWorked(d.clockIn, d.clockOut) ?? 0;
  }
  const denominator = monthDenominator(monthKey);
  // A day still in progress counts as attended; a past day with no clock-out counts as a half day until fixed.
  const attended = Math.min(denominator, present + open + 0.5 * (half + missingOut));
  const absent = Math.max(0, denominator - attended);
  const absenceRate = denominator ? Math.round((absent / denominator) * 100) : 0;
  return { present, half, missingOut, open, hours: Math.round(hours * 10) / 10, denominator, absent, absenceRate };
}
