"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { actionAdmin, actionUser, createSession, destroySession, getCurrentUser, type CurrentUser } from "@/lib/auth";
import { hashPassword, temporaryPassword, verifyPassword } from "@/lib/password";
import { getOrCreateCycle } from "@/lib/rotation";
import { WEEKS, addDays, currentMonthKey, istDateTime, todayDateStr, type WeekKey } from "@/lib/dates";
import { AppRole, FestiveFormat, PersonRole, StatusState } from "@/lib/enums";

/** Actions return a message instead of throwing: production builds hide thrown error text. */
export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

class Refused extends Error {}

async function run(fn: () => Promise<string | void>): Promise<ActionResult> {
  try {
    const message = await fn();
    revalidatePath("/", "layout");
    return { ok: true, message: message ?? undefined };
  } catch (e) {
    if (e instanceof Refused) return { ok: false, error: e.message };
    if (e instanceof Error && /sign in again|Only admins/.test(e.message)) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

function refuse(message: string): never {
  throw new Refused(message);
}

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function checkMonth(monthKey: string) {
  if (!MONTH.test(monthKey)) refuse("Invalid month.");
}

function count(value: number) {
  if (!Number.isFinite(value) || value < 0 || value > 100000) refuse("Enter a number of 0 or more.");
  return Math.round(value);
}

function text(value: unknown, what: string, max = 120) {
  const s = String(value ?? "").trim();
  if (!s) refuse(`Enter ${what}.`);
  if (s.length > max) refuse(`${what[0].toUpperCase() + what.slice(1)} is too long.`);
  return s;
}

async function brandCohortId(brandId: string) {
  const brand = await db.brands.get(brandId);
  if (!brand) refuse("That brand no longer exists.");
  return brand.cohortId;
}

async function assertLeadsBrand(user: CurrentUser, brandId: string) {
  if (user.isAdmin) return;
  const cohortId = await brandCohortId(brandId);
  if (!user.cohortIds.includes(cohortId)) refuse("You can only edit your own cohort's brands.");
}

/* ---------------- ACCOUNT ---------------- */

export async function signIn(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const login = String(form.get("login") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!login || !password) return { ok: false, error: "Enter your name or email and your password." };

  const person = await db.people.findOne(
    { active: true, $or: [{ name: login }, { email: login.toLowerCase() }] },
    { caseInsensitive: true },
  );
  if (!person || !verifyPassword(password, person.passwordHash)) {
    return { ok: false, error: "That name/email and password don't match. Ask an admin if you need a new password." };
  }
  await createSession(person.id);
  redirect(person.mustChangePassword ? "/account/password" : "/");
}

export async function signOut() {
  await destroySession();
  redirect("/login");
}

export async function changePassword(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const next = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (next.length < 8) return { ok: false, error: "Use at least 8 characters." };
  if (next !== confirm) return { ok: false, error: "The two passwords don't match." };
  await db.people.update({ id: user.id }, { passwordHash: hashPassword(next), mustChangePassword: false });
  redirect("/");
}

/* ---------------- BRAND × IP MATRIX ---------------- */

export async function setBrandIpValue(
  monthKey: string,
  brandId: string,
  ipId: string,
  field: "target" | "achieved" | "live",
  value: number,
) {
  return run(async () => {
    const user = await actionUser();
    checkMonth(monthKey);
    const v = count(value);
    if (!user.isAdmin) {
      const cohortId = await brandCohortId(brandId);
      const leads = user.cohortIds.includes(cohortId);
      if (field === "target" && !leads) refuse("Only this brand's cohort leader sets its targets.");
      if (field !== "target" && !leads && !user.ipcsIpIds.includes(ipId)) {
        refuse("Only this brand's cohort leader or the IP's IP CS can update it.");
      }
    }
    await db.brandIpMonths.upsert({ monthKey, brandId, ipId }, { [field]: v, updatedAt: new Date() });
  });
}

/* ---------------- ROTATION ---------------- */

async function getEntry(monthKey: string, ipId: string, week: WeekKey) {
  const cycle = await getOrCreateCycle(monthKey);
  return db.rotationEntries.getOrThrow({ cycleId: cycle.id, ipId, week });
}

/** Changes an IP's weekly target from this month on (admins). */
export async function setIpWeeklyTarget(monthKey: string, ipId: string, target: number) {
  return run(async () => {
    await actionAdmin();
    checkMonth(monthKey);
    const v = count(target);
    await getOrCreateCycle(monthKey);
    await db.ips.update({ id: ipId }, { defaultWeeklyTarget: v });
    const cycles = await db.rotationCycles.find({ monthKey: { $gte: monthKey } });
    await db.rotationEntries.updateMany({ ipId, cycleId: { $in: cycles.map((c) => c.id) } }, { target: v });
  });
}

export async function toggleRotationCohort(monthKey: string, ipId: string, week: WeekKey, cohortId: string) {
  return run(async () => {
    await actionAdmin();
    checkMonth(monthKey);
    if (!WEEKS.includes(week)) refuse("Invalid week.");
    const entry = await getEntry(monthKey, ipId, week);
    const removed = await db.rotationAssignments.delete({ entryId: entry.id, cohortId });
    if (!removed) await db.rotationAssignments.create({ entryId: entry.id, cohortId });
  });
}

/* ---------------- TRADES & COHORT PROGRESS ---------------- */

export async function submitTrade(input: {
  monthKey: string;
  ipId: string;
  week: WeekKey;
  releasedCohortId: string;
  claimedCohortId: string;
  note?: string;
}) {
  return run(async () => {
    const user = await actionUser();
    if (!user.isAdmin && user.appRole !== "COHORT_LEADER") refuse("Only cohort leaders and admins log trades.");
    checkMonth(input.monthKey);
    if (input.releasedCohortId === input.claimedCohortId) refuse("A cohort can't trade with itself.");
    const cycle = await getOrCreateCycle(input.monthKey);
    await db.trades.create({
      cycleId: cycle.id,
      ipId: input.ipId,
      week: input.week,
      releasedCohortId: input.releasedCohortId,
      claimedCohortId: input.claimedCohortId,
      note: input.note?.trim().slice(0, 300) || null,
    });
  });
}

export async function deleteTrade(tradeId: string) {
  return run(async () => {
    const user = await actionUser();
    if (!user.isAdmin && user.appRole !== "COHORT_LEADER") refuse("Only cohort leaders and admins can remove trades.");
    await db.trades.delete({ id: tradeId });
  });
}

const STATUS_CYCLE: Record<StatusState, StatusState> = {
  PENDING: StatusState.PARTIAL,
  PARTIAL: StatusState.DONE,
  DONE: StatusState.PENDING,
};

export async function cycleCohortWeeklyStatus(monthKey: string, cohortId: string, ipId: string, week: WeekKey) {
  return run(async () => {
    const user = await actionUser();
    if (!user.isAdmin && !user.cohortIds.includes(cohortId) && !user.ipcsIpIds.includes(ipId)) {
      refuse("Only this cohort's leader or the IP's IP CS can update this.");
    }
    const cycle = await getOrCreateCycle(monthKey);
    const where = { cycleId: cycle.id, cohortId, ipId, week };
    const existing = await db.cohortWeeklyStatuses.findOne(where);
    const next = STATUS_CYCLE[existing?.status ?? StatusState.PENDING];
    await db.cohortWeeklyStatuses.upsert(where, { status: next });
  });
}

/* ---------------- FESTIVE & NON-IP ---------------- */

export async function addFestiveRow(monthKey: string, brandId: string, festivalId: string) {
  return run(async () => {
    const user = await actionUser();
    checkMonth(monthKey);
    await assertLeadsBrand(user, brandId);
    if (!(await db.festivals.get(festivalId))) refuse("Pick a festival.");
    for (const format of Object.values(FestiveFormat)) {
      await db.festiveEntries.upsert({ monthKey, brandId, festivalId, format }, {});
    }
  });
}

export async function removeFestiveRow(monthKey: string, brandId: string, festivalId: string) {
  return run(async () => {
    const user = await actionUser();
    await assertLeadsBrand(user, brandId);
    await db.festiveEntries.deleteMany({ monthKey, brandId, festivalId });
  });
}

export async function setFestiveValue(
  monthKey: string,
  brandId: string,
  festivalId: string,
  format: FestiveFormat,
  field: "target" | "achieved" | "live",
  value: number,
) {
  return run(async () => {
    const user = await actionUser();
    checkMonth(monthKey);
    await assertLeadsBrand(user, brandId);
    const v = count(value);
    await db.festiveEntries.upsert({ monthKey, brandId, festivalId, format }, { [field]: v });
  });
}

export async function setNonIpValue(monthKey: string, brandId: string, field: "target" | "achieved" | "live", value: number) {
  return run(async () => {
    const user = await actionUser();
    checkMonth(monthKey);
    await assertLeadsBrand(user, brandId);
    const v = count(value);
    await db.nonIpEntries.upsert({ monthKey, brandId }, { [field]: v });
  });
}

/* ---------------- ATTENDANCE ---------------- */

/**
 * Clock in for today. If yesterday (or an earlier day) was left without a
 * clock-out, that time must be given first.
 */
export async function clockIn(previousClockOut: string | null) {
  return run(async () => {
    const user = await actionUser();
    const today = todayDateStr();
    const open = await db.attendanceDays.findOne({ personId: user.id, clockOut: null, day: { $lt: today } }, { sort: { day: -1 } });
    if (open) {
      if (!previousClockOut || !HHMM.test(previousClockOut)) refuse(`Enter the time you clocked out on ${open.day} first.`);
      const out = istDateTime(open.day, previousClockOut);
      if (out <= open.clockIn) refuse("That clock-out time is before you clocked in that day.");
      await db.attendanceDays.update({ id: open.id }, { clockOut: out, note: "Clock-out added next day" });
    }
    const existing = await db.attendanceDays.findOne({ personId: user.id, day: today });
    if (existing) refuse("You've already clocked in today.");
    await db.attendanceDays.create({ personId: user.id, day: today, clockIn: new Date() });
    return "Clocked in";
  });
}

export async function clockOut() {
  return run(async () => {
    const user = await actionUser();
    const today = todayDateStr();
    const day = await db.attendanceDays.findOne({ personId: user.id, day: today });
    if (!day) refuse("You haven't clocked in today.");
    if (day.clockOut) refuse("You've already clocked out today.");
    await db.attendanceDays.update({ id: day.id }, { clockOut: new Date() });
    return "Clocked out";
  });
}

/** Admins correct or add a day. Times are India time, "HH:MM"; clock-out may be empty. */
export async function adminSetAttendance(personId: string, day: string, inTime: string, outTime: string) {
  return run(async () => {
    await actionAdmin();
    if (!DAY.test(day) || day > todayDateStr()) refuse("Pick a date that isn't in the future.");
    if (!HHMM.test(inTime)) refuse("Enter a clock-in time like 09:30.");
    if (outTime && !HHMM.test(outTime)) refuse("Enter a clock-out time like 18:30, or leave it empty.");
    const clockIn = istDateTime(day, inTime);
    let clockOutAt = outTime ? istDateTime(day, outTime) : null;
    // A clock-out earlier than clock-in means the shift ran past midnight.
    if (clockOutAt && clockOutAt <= clockIn) clockOutAt = istDateTime(addDays(day, 1), outTime);
    const existing = await db.attendanceDays.findOne({ personId, day });
    await db.attendanceDays.upsert(
      { personId, day },
      { clockIn, clockOut: clockOutAt, note: existing ? "Edited by admin" : "Added by admin" },
    );
  });
}

export async function adminDeleteAttendance(personId: string, day: string) {
  return run(async () => {
    await actionAdmin();
    await db.attendanceDays.deleteMany({ personId, day });
  });
}

/* ---------------- ADMIN: TARGETS ---------------- */

export async function saveTargetSettings(baseMonthly: number, perBrand: number) {
  return run(async () => {
    await actionAdmin();
    for (const [key, value] of [
      ["target.baseMonthly", count(baseMonthly)],
      ["target.perBrand", count(perBrand)],
    ] as const) {
      await db.appSettings.upsert({ key }, { value: String(value) });
    }
  });
}

/** Set (or clear, with null) a month's base override and/or its entered achieved total. */
export async function saveMonthSetting(monthKey: string, field: "baseOverride" | "achievedOverride", value: number | null) {
  return run(async () => {
    await actionAdmin();
    checkMonth(monthKey);
    const v = value === null ? null : count(value);
    await db.monthSettings.upsert({ monthKey }, { [field]: v });
  });
}

/* ---------------- ADMIN: COHORTS & BRANDS ---------------- */

export async function addCohort(code: string, leaderPersonId: string) {
  return run(async () => {
    await actionAdmin();
    const c = text(code, "a cohort code", 12).toUpperCase();
    const leader = await db.people.get(leaderPersonId);
    if (!leader) refuse("Pick the cohort leader.");
    if (await db.cohorts.findOne({ code: c })) refuse(`${c} already exists.`);
    await db.cohorts.create({ code: c, leaderName: leader.name, leaderPersonId: leader.id });
    if (leader.appRole !== "ADMIN") await db.people.update({ id: leader.id }, { appRole: "COHORT_LEADER" });
  });
}

export async function setCohortLeader(cohortId: string, personId: string) {
  return run(async () => {
    await actionAdmin();
    const leader = await db.people.get(personId);
    if (!leader) refuse("Pick the cohort leader.");
    await db.cohorts.update({ id: cohortId }, { leaderName: leader.name, leaderPersonId: leader.id });
    if (leader.appRole !== "ADMIN") await db.people.update({ id: leader.id }, { appRole: "COHORT_LEADER" });
  });
}

export async function addBrand(name: string, cohortId: string) {
  return run(async () => {
    await actionAdmin();
    const n = text(name, "a brand name");
    if (await db.brands.findOne({ name: n }, { caseInsensitive: true })) refuse(`${n} already exists.`);
    // Added after launch: from this month it adds to the IP base target.
    await db.brands.create({ name: n, cohortId, addedMonthKey: currentMonthKey() });
  });
}

export async function updateBrand(brandId: string, name: string, cohortId: string) {
  return run(async () => {
    await actionAdmin();
    const n = text(name, "a brand name");
    const clash = await db.brands.findOne({ name: n, id: { $ne: brandId } }, { caseInsensitive: true });
    if (clash) refuse(`${n} already exists.`);
    await db.brands.update({ id: brandId }, { name: n, cohortId });
  });
}

export async function setBrandArchived(brandId: string, archived: boolean) {
  return run(async () => {
    await actionAdmin();
    await db.brands.update({ id: brandId }, { archivedMonthKey: archived ? currentMonthKey() : null });
  });
}

/* ---------------- ADMIN: PEOPLE & IP TEAMS ---------------- */

const ROLES = Object.values(AppRole);

export async function addPerson(name: string, appRole: AppRole, email: string) {
  return run(async () => {
    await actionAdmin();
    const n = text(name, "a name", 80);
    if (!ROLES.includes(appRole)) refuse("Pick a role.");
    const e = email.trim().toLowerCase() || null;
    if (e && !/^\S+@\S+\.\S+$/.test(e)) refuse("Enter a valid email, or leave it empty.");
    if (await db.people.findOne({ name: n }, { caseInsensitive: true })) refuse(`${n} is already on the team.`);
    if (e && (await db.people.findOne({ email: e }))) refuse("Someone already uses that email.");
    await db.people.create({ name: n, appRole, email: e });
  });
}

export async function updatePerson(personId: string, appRole: AppRole, email: string, active: boolean) {
  return run(async () => {
    const admin = await actionAdmin();
    if (!ROLES.includes(appRole)) refuse("Pick a role.");
    const e = email.trim().toLowerCase() || null;
    if (e && !/^\S+@\S+\.\S+$/.test(e)) refuse("Enter a valid email, or leave it empty.");
    if (e && (await db.people.findOne({ email: e, id: { $ne: personId } }))) refuse("Someone already uses that email.");
    if (personId === admin.id && (appRole !== "ADMIN" || !active)) refuse("You can't remove your own admin access.");
    await db.people.update({ id: personId }, { appRole, email: e, active });
    if (!active) await db.sessions.deleteMany({ personId });
  });
}

/** Issues a one-time password; the person must choose their own on first sign-in. */
export async function resetPassword(personId: string) {
  return run(async () => {
    await actionAdmin();
    const temp = temporaryPassword();
    await db.people.update({ id: personId }, { passwordHash: hashPassword(temp), mustChangePassword: true });
    await db.sessions.deleteMany({ personId });
    return temp;
  });
}

export async function addIp(name: string, weeklyTarget: number) {
  return run(async () => {
    await actionAdmin();
    const n = text(name, "an IP name");
    if (await db.ips.findOne({ name: n })) refuse(`${n} already exists.`);
    const last = await db.ips.findOne({}, { sort: { sortOrder: -1 } });
    await db.ips.create({ name: n, defaultWeeklyTarget: count(weeklyTarget), sortOrder: (last?.sortOrder ?? 0) + 1 });
  });
}

export async function addIpMember(ipId: string, personId: string, role: PersonRole) {
  return run(async () => {
    await actionAdmin();
    if (!Object.values(PersonRole).includes(role)) refuse("Pick a role.");
    await db.personAssignments.upsert({ personId, ipId, role }, {});
  });
}

export async function removeIpMember(assignmentId: string) {
  return run(async () => {
    await actionAdmin();
    await db.personAssignments.delete({ id: assignmentId });
  });
}

/* ---------------- ADMIN: FESTIVALS ---------------- */

export async function addFestival(month: number, dateLabel: string, name: string) {
  return run(async () => {
    await actionAdmin();
    if (!(month >= 1 && month <= 12)) refuse("Pick a month.");
    const last = await db.festivals.findOne({}, { sort: { sortOrder: -1 } });
    await db.festivals.create({
      month,
      dateLabel: text(dateLabel, "a date", 30),
      name: text(name, "a festival name"),
      sortOrder: (last?.sortOrder ?? 0) + 1,
    });
  });
}

export async function updateFestival(festivalId: string, month: number, dateLabel: string, name: string, active: boolean) {
  return run(async () => {
    await actionAdmin();
    if (!(month >= 1 && month <= 12)) refuse("Pick a month.");
    await db.festivals.update({ id: festivalId }, { month, dateLabel: text(dateLabel, "a date", 30), name: text(name, "a festival name"), active });
  });
}

