import { db, sumByMonth } from "@/lib/db";
import { currentMonthKey, yearMonths } from "@/lib/dates";

export const DEFAULT_BASE = 192;
export const DEFAULT_PER_BRAND = 4;

export async function getTargetSettings() {
  const rows = await db.appSettings.find({ key: { $in: ["target.baseMonthly", "target.perBrand"] } });
  const get = (key: string, fallback: number) => {
    const v = Number(rows.find((r) => r.key === key)?.value);
    return Number.isFinite(v) && v >= 0 ? v : fallback;
  };
  return { baseMonthly: get("target.baseMonthly", DEFAULT_BASE), perBrand: get("target.perBrand", DEFAULT_PER_BRAND) };
}

export type YearRow = {
  monthKey: string;
  timing: "past" | "current" | "future";
  base: number;
  baseIsOverride: boolean;
  newBrands: number;
  /** Shortfall carried in from the previous month; null while that month is still open. */
  backlogIn: number | null;
  target: number;
  achieved: number;
  achievedIsOverride: boolean;
  /** Target minus achieved (past and current months). */
  gap: number | null;
  festive: { target: number; achieved: number; live: number };
  nonIp: { target: number; achieved: number; live: number };
  ipLive: number;
};

/**
 * The June–May year, month by month.
 *
 * IP base = monthly base (192) + 4 for every brand added after launch that is
 * active that month, unless an admin set a base for that month.
 * IP target = base + the previous month's shortfall. A shortfall carries
 * forward (target − achieved, if positive); a surplus never lowers later
 * targets. The carry starts fresh each June.
 */
export async function getYearSummary(startYear: number) {
  const months = yearMonths(startYear);
  const first = months[0];
  const last = months[months.length - 1];
  const now = currentMonthKey();

  const [settings, brands, monthSettings, matrix, festive, nonIp] = await Promise.all([
    getTargetSettings(),
    db.brands.find(),
    db.monthSettings.find({ monthKey: { $gte: first, $lte: last } }),
    sumByMonth(db.brandIpMonths, ["achieved", "live"], first, last),
    sumByMonth(db.festiveEntries, ["target", "achieved", "live"], first, last),
    sumByMonth(db.nonIpEntries, ["target", "achieved", "live"], first, last),
  ]);

  const rows: YearRow[] = [];
  let carry = 0;
  let carryKnown = true;
  for (const monthKey of months) {
    const timing = monthKey < now ? "past" : monthKey === now ? "current" : "future";
    const setting = monthSettings.find((s) => s.monthKey === monthKey);
    const newBrands = brands.filter(
      (b) => b.addedMonthKey && b.addedMonthKey <= monthKey && (!b.archivedMonthKey || b.archivedMonthKey > monthKey),
    ).length;
    const base = setting?.baseOverride ?? settings.baseMonthly + settings.perBrand * newBrands;
    const m = matrix.get(monthKey);
    const achieved = setting?.achievedOverride ?? m?.achieved ?? 0;
    const backlogIn = carryKnown ? carry : null;
    const target = base + (backlogIn ?? 0);
    const f = festive.get(monthKey);
    const n = nonIp.get(monthKey);

    rows.push({
      monthKey,
      timing,
      base,
      baseIsOverride: setting?.baseOverride != null,
      newBrands,
      backlogIn,
      target,
      achieved,
      achievedIsOverride: setting?.achievedOverride != null,
      gap: timing === "future" ? null : target - achieved,
      festive: { target: f?.target ?? 0, achieved: f?.achieved ?? 0, live: f?.live ?? 0 },
      nonIp: { target: n?.target ?? 0, achieved: n?.achieved ?? 0, live: n?.live ?? 0 },
      ipLive: m?.live ?? 0,
    });

    // Only a finished month's shortfall is known and carried forward.
    if (timing === "past" && carryKnown) {
      carry = Math.max(0, target - achieved);
    } else {
      carryKnown = false;
    }
  }

  const current = rows.find((r) => r.timing === "current") ?? null;
  const toDate = rows.filter((r) => r.timing !== "future");
  const totals = {
    base: rows.reduce((s, r) => s + r.base, 0),
    achieved: rows.reduce((s, r) => s + r.achieved, 0),
    ipLive: rows.reduce((s, r) => s + r.ipLive, 0),
    baseToDate: toDate.reduce((s, r) => s + r.base, 0),
    festive: {
      target: rows.reduce((s, r) => s + r.festive.target, 0),
      achieved: rows.reduce((s, r) => s + r.festive.achieved, 0),
      live: rows.reduce((s, r) => s + r.festive.live, 0),
    },
    nonIp: {
      target: rows.reduce((s, r) => s + r.nonIp.target, 0),
      achieved: rows.reduce((s, r) => s + r.nonIp.achieved, 0),
      live: rows.reduce((s, r) => s + r.nonIp.live, 0),
    },
  };
  return { rows, totals, current, settings };
}
