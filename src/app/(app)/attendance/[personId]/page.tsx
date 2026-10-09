import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, Card, CardHead, KpiTile, Th, Td } from "@/components/ui";
import { MonthSwitcher } from "@/components/Switchers";
import { AdminDayForm } from "@/components/AttendanceControls";
import { HoursChart } from "@/components/AttendanceChart";
import { AbsenceBadge } from "@/components/AbsenceBadge";
import { getMyAttendance, getPerson } from "@/lib/queries";
import { requireAdminPage, ROLE_LABEL } from "@/lib/auth";
import { dayStatus, hoursWorked, type DayStatus } from "@/lib/attendance";
import { currentMonthKey, daysInMonth, monthKeyLabel, timeLabel, todayDateStr, yearMonths, yearStartFor } from "@/lib/dates";

const TONE = {
  present: { bg: "var(--brand-ink)", fg: "#fff", label: "Present" },
  half: { bg: "#f7a6cd", fg: "#5a0c33", label: "Half day" },
  open: { bg: "var(--brand-soft)", fg: "var(--brand-ink)", label: "In progress" },
  "missing-out": { bg: "var(--status-warning-bg)", fg: "#8a5a00", label: "No clock-out" },
  none: { bg: "var(--surface-tint)", fg: "var(--text-muted)", label: "Absent / not logged" },
} as const;

export default async function PersonAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ personId: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  await requireAdminPage();
  const { personId } = await params;
  const { month } = await searchParams;
  const now = currentMonthKey();
  const monthKey = month && /^\d{4}-\d{2}$/.test(month) ? month : now;
  const person = await getPerson(personId);
  if (!person) notFound();

  const { days, summary } = await getMyAttendance(person.id, monthKey);
  const byDay = new Map(days.map((d) => [d.day, d]));
  const today = todayDateStr();
  const count = daysInMonth(monthKey);
  const calendar = Array.from({ length: count }, (_, i) => {
    const day = `${monthKey}-${String(i + 1).padStart(2, "0")}`;
    const rec = byDay.get(day);
    const status: DayStatus | "none" = rec ? dayStatus(day, rec.clockIn, rec.clockOut) : "none";
    return { n: i + 1, day, rec, status, future: day > today };
  });
  const chartData = calendar.map((c) => {
    const h = c.rec ? hoursWorked(c.rec.clockIn, c.rec.clockOut) ?? 0 : 0;
    return { day: c.n, hours: Math.round(h * 10) / 10, label: TONE[c.status].label };
  });
  const firstWeekday = (new Date(`${monthKey}-01T00:00:00Z`).getUTCDay() + 6) % 7; // Monday first

  return (
    <div>
      <PageHeader
        title={person.name}
        subtitle={`${ROLE_LABEL[person.appRole]} · ${monthKeyLabel(monthKey)}`}
        right={
          <>
            <Link href={`/attendance?month=${monthKey}`} className="text-[11px] underline" style={{ color: "var(--text-secondary)" }}>
              ← All people
            </Link>
            <MonthSwitcher monthKeys={yearMonths(yearStartFor(now)).filter((m) => m <= now)} current={monthKey} />
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <KpiTile label="Present" value={`${summary.present} / ${summary.denominator}`} meta="Days with 8+ hours" />
        <KpiTile label="Half days" value={summary.half} meta="Under 8 hours" />
        <KpiTile label="No clock-out" value={summary.missingOut} meta="Counted as half days" />
        <KpiTile label="Absent" value={summary.absent} meta="Days not worked" />
        <KpiTile label="Absence rate" value={<AbsenceBadge rate={summary.absenceRate} />} meta={`${summary.hours} hours logged`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
        <Card>
          <CardHead title="Calendar" />
          <div className="p-4">
            <div className="grid grid-cols-7 gap-1.5 text-center">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="text-[9px] font-bold uppercase" style={{ color: "var(--text-muted)" }}>
                  {d}
                </div>
              ))}
              {Array.from({ length: firstWeekday }, (_, i) => (
                <div key={`pad${i}`} />
              ))}
              {calendar.map((c) => {
                const tone = TONE[c.status];
                return (
                  <div
                    key={c.day}
                    className="rounded-lg py-2 text-[11px] font-bold tabular-nums"
                    title={c.future ? "" : tone.label}
                    style={{ background: c.future ? "transparent" : tone.bg, color: c.future ? "var(--text-muted)" : tone.fg, border: "1px solid var(--border)" }}
                  >
                    {c.n}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3 mt-3 text-[10px]" style={{ color: "var(--text-muted)" }}>
              {(["present", "half", "missing-out", "none"] as const).map((k) => (
                <span key={k}>
                  <span className="inline-block w-2.5 h-2.5 rounded-sm align-middle mr-1" style={{ background: TONE[k].bg, border: "1px solid var(--border)" }} />
                  {TONE[k].label}
                </span>
              ))}
            </div>
          </div>
        </Card>
        <Card>
          <CardHead title="Hours per day" subtitle="The line marks a full 8-hour day" />
          <div className="p-4">
            <HoursChart data={chartData} />
          </div>
        </Card>
      </div>

      <Card>
        <CardHead title="Days" subtitle="Correct a day's times, or add a missing day. Times are India time." right={<AdminDayForm personId={person.id} maxDay={today} />} />
        <div className="overflow-auto">
          <table className="w-full border-collapse" style={{ minWidth: 560 }}>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Status</Th>
                <Th align="right">Hours</Th>
                <Th>In / out (edit)</Th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => {
                const h = hoursWorked(d.clockIn, d.clockOut);
                return (
                  <tr key={d.id}>
                    <Td className="font-semibold">
                      {d.day}
                      {d.note ? <div className="text-[9.5px] font-normal" style={{ color: "var(--text-muted)" }}>{d.note}</div> : null}
                    </Td>
                    <Td>{TONE[dayStatus(d.day, d.clockIn, d.clockOut)].label}</Td>
                    <Td align="right" className="tabular-nums">{h === null ? "—" : h.toFixed(1)}</Td>
                    <Td>
                      <AdminDayForm personId={person.id} day={d.day} inTime={timeLabel(d.clockIn)} outTime={d.clockOut ? timeLabel(d.clockOut) : ""} maxDay={today} />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
