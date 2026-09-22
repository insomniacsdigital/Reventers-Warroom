import Link from "next/link";
import { PageHeader, Card, CardHead } from "@/components/ui";
import { MonthSwitcher } from "@/components/MonthSwitcher";
import { WeekTabs } from "@/components/WeekTabs";
import { RotationTargetCell, RotationAchievedCell, CohortChip } from "@/components/RotationCells";
import { getRotationView, listCycleMonthKeys, getIpsWithRoster } from "@/lib/queries";
import { currentMonthKey, type WeekKey } from "@/lib/dates";

export default async function RotationPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; week?: string }>;
}) {
  const params = await searchParams;
  const monthKey = params.month ?? currentMonthKey();
  const week = (params.week ?? "W1") as WeekKey;

  const [{ rows, cohorts }, monthKeys, ipsWithRoster] = await Promise.all([
    getRotationView(monthKey),
    listCycleMonthKeys(),
    getIpsWithRoster(),
  ]);
  const ipcsByIpId = new Map(ipsWithRoster.map((ip) => [ip.id, ip.ipcs]));

  return (
    <div>
      <PageHeader
        title="Weekly IP Rotation"
        subtitle="Two cohorts typically share an IP per week, on a W1–W4 monthly cycle"
        right={<MonthSwitcher monthKeys={monthKeys} current={monthKey} />}
      />
      <Card>
        <CardHead title="Rotation Schedule" subtitle="Click a cohort chip to add/remove it; click a target or achieved number to edit it" right={<WeekTabs current={week} />} />
        <div className="overflow-auto">
          <table className="w-full border-collapse" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                {["IP", "IP CS", "Weekly Target", "Assigned Cohorts", "Achieved", "Trades"].map((h) => (
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
              {rows.map(({ ip, byWeek }) => {
                const w = byWeek[week];
                return (
                  <tr key={ip.id}>
                    <td className="px-3 py-2.5 border-b text-[11px] font-bold" style={{ borderColor: "var(--border)" }}>
                      {ip.name}
                    </td>
                    <td className="px-3 py-2.5 border-b text-[11px]" style={{ borderColor: "var(--border)" }}>
                      {ipcsByIpId.get(ip.id) ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 border-b text-[11px]" style={{ borderColor: "var(--border)" }}>
                      <RotationTargetCell monthKey={monthKey} ipId={ip.id} week={week} target={w.target} />
                    </td>
                    <td className="px-3 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
                      {cohorts.map((c) => (
                        <CohortChip
                          key={c.id}
                          monthKey={monthKey}
                          ipId={ip.id}
                          week={week}
                          cohortId={c.id}
                          cohortCode={c.code}
                          active={w.assignedCohortCodes.includes(c.code)}
                        />
                      ))}
                    </td>
                    <td className="px-3 py-2.5 border-b text-[11px]" style={{ borderColor: "var(--border)" }}>
                      <RotationAchievedCell monthKey={monthKey} ipId={ip.id} week={week} achieved={w.achieved} target={w.target} />
                    </td>
                    <td className="px-3 py-2.5 border-b text-center" style={{ borderColor: "var(--border)" }}>
                      <Link
                        href={`/trades?month=${monthKey}&ip=${ip.id}`}
                        className="text-[11px] font-bold underline"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {w.tradeCount}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 text-[10px] border-t" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
          IP CS shown on the{" "}
          <Link href="/ip-cs" className="underline">
            IP CS Allocation
          </Link>{" "}
          page. Assignments and targets are independent per week, and this cycle&apos;s data is separate from other months — see{" "}
          <Link href="/trends" className="underline">
            Trends
          </Link>{" "}
          for month-over-month history.
        </div>
      </Card>
    </div>
  );
}
