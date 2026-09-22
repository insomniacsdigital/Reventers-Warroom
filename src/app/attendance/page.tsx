import { PageHeader, Card, CardHead } from "@/components/ui";
import { DateSwitcher } from "@/components/DateSwitcher";
import { AttendancePill } from "@/components/AttendancePill";
import { getAttendanceView } from "@/lib/queries";
import { todayDateStr } from "@/lib/dates";
import { PersonRole } from "@/generated/prisma/enums";

const ROLE_LABEL: Record<string, string> = {
  IP_CS: "IP CS",
  DESIGNER: "Designer",
  EDITOR: "Editor",
};

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const params = await searchParams;
  const date = params.date ?? todayDateStr();
  const rows = await getAttendanceView(date);

  return (
    <div>
      <PageHeader title="Attendance Register" subtitle="Present / Absent, by day, for every IP CS, Designer and Editor" />
      <Card>
        <CardHead
          title="Daily Register"
          subtitle="Click a status pill to cycle Not marked → Present → Absent → Not marked"
          right={<DateSwitcher current={date} />}
        />
        <div className="overflow-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {["IP", "Role", "Person", "Status", "Absences this month"].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 border-b text-left text-[9px] uppercase tracking-wide"
                    style={{ borderColor: "var(--border)", color: "var(--text-muted)", background: "var(--surface-raised)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.personId}-${r.ipName}-${r.role}-${i}`}>
                  <td className="px-3 py-2.5 border-b text-[11px]" style={{ borderColor: "var(--border)" }}>
                    {r.ipName}
                  </td>
                  <td className="px-3 py-2.5 border-b text-[11px]" style={{ borderColor: "var(--border)" }}>
                    {ROLE_LABEL[r.role as PersonRole]}
                  </td>
                  <td className="px-3 py-2.5 border-b text-[11px] font-bold" style={{ borderColor: "var(--border)" }}>
                    {r.personName}
                  </td>
                  <td className="px-3 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
                    <AttendancePill personId={r.personId} dateStr={date} status={r.status} />
                  </td>
                  <td className="px-3 py-2.5 border-b text-[11px] tabular-nums" style={{ borderColor: "var(--border)" }}>
                    {r.absencesThisMonth}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 text-[10px] border-t" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
          Attendance is tracked per person, so marking someone absent applies wherever they appear (e.g. an IP CS who covers several IPs). Historical dates remain editable.
        </div>
      </Card>
    </div>
  );
}
