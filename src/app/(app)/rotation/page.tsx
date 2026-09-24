import Link from "next/link";
import { PageHeader, Card, CardHead, Th, Td, ProgressBar } from "@/components/ui";
import { MonthSwitcher } from "@/components/Switchers";
import { WeeklyTargetCell, CohortChip } from "@/components/RotationCells";
import { getRotationView, listCycleMonthKeys } from "@/lib/queries";
import { requireUser } from "@/lib/auth";
import { WEEKS, currentMonthKey, yearMonths, yearStartFor } from "@/lib/dates";

export default async function RotationPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const now = currentMonthKey();
  const monthKey = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : now;

  const [{ rows, cohorts }, cycleMonths] = await Promise.all([getRotationView(monthKey), listCycleMonthKeys()]);
  const monthKeys = Array.from(new Set([...cycleMonths, ...yearMonths(yearStartFor(now))])).sort();
  const cohortById = new Map(cohorts.map((c) => [c.id, c]));
  const weeklyTotal = rows.reduce((s, r) => s + r.byWeek.W1.target, 0);
  const monthlyTotal = rows.reduce((s, r) => s + r.monthTarget, 0);
  const achievedTotal = rows.reduce((s, r) => s + r.achieved, 0);

  return (
    <div>
      <PageHeader
        title="Weekly IP Rotation"
        subtitle="Which cohorts each IP works with in W1–W4. The same pattern repeats every month."
        right={<MonthSwitcher monthKeys={monthKeys} current={monthKey} />}
      />
      <Card>
        <CardHead
          title="Rotation schedule"
          subtitle={
            user.isAdmin
              ? "Admins: use edit under a week to change its cohorts; click a weekly target to change it from this month on. W1 = days 1–7 · W2 = 8–14 · W3 = 15–21 · W4 = 22 to month end."
              : "W1 = days 1–7 · W2 = 8–14 · W3 = 15–21 · W4 = 22 to month end. Achieved comes from the Brand × IP Matrix."
          }
        />
        <div className="overflow-auto">
          <table className="w-full border-collapse" style={{ minWidth: 1150 }}>
            <thead>
              <tr>
                <Th>#</Th>
                <Th>IP</Th>
                <Th>Team</Th>
                <Th align="right">Weekly target</Th>
                {WEEKS.map((w) => (
                  <Th key={w} align="center">
                    {w}
                  </Th>
                ))}
                <Th align="right">Month: achieved / target</Th>
                <Th align="center">Trades</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ team, byWeek, monthTarget, achieved, live }, i) => {
                const pct = monthTarget ? Math.round((achieved / monthTarget) * 100) : 0;
                const trades = WEEKS.reduce((s, w) => s + byWeek[w].tradeCount, 0);
                return (
                  <tr key={team.id}>
                    <Td className="tabular-nums" style={{ color: "var(--text-muted)" }}>
                      {i + 1}
                    </Td>
                    <Td className="font-bold">{team.name}</Td>
                    <Td className="text-[10.5px] leading-snug">
                      <div>
                        <b>IP CS:</b> {team.ipcs.join(" + ") || "—"}
                      </div>
                      <div style={{ color: "var(--text-secondary)" }}>
                        Designer: {team.designers.join(" / ") || "Cohort designers"} · Editors: {team.editors.join(", ") || "—"}
                      </div>
                    </Td>
                    <Td align="right" className="tabular-nums font-bold">
                      <WeeklyTargetCell monthKey={monthKey} ipId={team.id} target={byWeek.W1.target} editable={user.isAdmin} />
                    </Td>
                    {WEEKS.map((w) => (
                      <Td key={w} align="center" className="text-[10.5px]">
                        <span className="font-semibold">
                          {byWeek[w].cohortIds.map((id) => cohortById.get(id)?.leaderName).filter(Boolean).join(" + ") || "—"}
                        </span>
                        {user.isAdmin && (
                          <details className="mt-1">
                            <summary className="cursor-pointer text-[9.5px] underline" style={{ color: "var(--brand-ink)" }}>
                              edit
                            </summary>
                            <div className="mt-1">
                              {cohorts.map((c) => (
                                <CohortChip
                                  key={c.id}
                                  monthKey={monthKey}
                                  ipId={team.id}
                                  week={w}
                                  cohortId={c.id}
                                  label={c.leaderName}
                                  active={byWeek[w].cohortIds.includes(c.id)}
                                />
                              ))}
                            </div>
                          </details>
                        )}
                      </Td>
                    ))}
                    <Td align="right" className="tabular-nums min-w-[150px]">
                      <div>
                        <b>{achieved}</b> / {monthTarget} · {live} live
                      </div>
                      <div className="mt-1">
                        <ProgressBar pct={pct} />
                      </div>
                    </Td>
                    <Td align="center">
                      <Link href={`/trades?month=${monthKey}&ip=${team.id}`} className="text-[11px] font-bold underline" style={{ color: "var(--text-secondary)" }}>
                        {trades}
                      </Link>
                    </Td>
                  </tr>
                );
              })}
              <tr style={{ background: "var(--surface-tint)" }}>
                <Td />
                <Td className="font-extrabold">Total</Td>
                <Td />
                <Td align="right" className="tabular-nums font-extrabold">
                  {weeklyTotal}
                </Td>
                <Td />
                <Td />
                <Td />
                <Td />
                <Td align="right" className="tabular-nums font-extrabold">
                  {achievedTotal} / {monthlyTotal}
                </Td>
                <Td />
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
