import { PageHeader, Card, CardHead, ProgressBar } from "@/components/ui";
import { MonthSwitcher } from "@/components/Switchers";
import { WeekTabs } from "@/components/WeekTabs";
import { CohortTabs } from "@/components/CohortTabs";
import { CohortWeeklyStatusPill } from "@/components/CohortWeeklyStatusPill";
import { getCohorts, getCohortWeeklyView, getCohortMonthlySummary, listCycleMonthKeys } from "@/lib/queries";
import { currentMonthKey, type WeekKey } from "@/lib/dates";

export default async function CohortProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; week?: string; cohort?: string }>;
}) {
  const params = await searchParams;
  const monthKey = params.month ?? currentMonthKey();
  const week = (params.week ?? "W1") as WeekKey;

  const cohorts = await getCohorts();
  const cohortId = params.cohort ?? cohorts[0]?.id;
  const activeCohort = cohorts.find((c) => c.id === cohortId) ?? cohorts[0];

  const [ipRows, summary, monthKeys] = await Promise.all([
    activeCohort ? getCohortWeeklyView(monthKey, activeCohort.id, week) : Promise.resolve([]),
    getCohortMonthlySummary(monthKey),
    listCycleMonthKeys(),
  ]);

  return (
    <div>
      <PageHeader
        title="Cohort Weekly Progress"
        subtitle="Pick a cohort and a week to see which IPs it's responsible for, net of trades"
        right={<MonthSwitcher monthKeys={monthKeys} current={monthKey} />}
      />

      <Card className="mb-5">
        <CardHead title="This Cohort, This Week" right={<WeekTabs current={week} />} />
        <div className="px-5 pt-4">
          <CohortTabs cohorts={cohorts.map((c) => ({ id: c.id, code: `${c.code} · ${c.leaderName}` }))} current={activeCohort?.id ?? ""} />
        </div>
        <div className="p-5">
          {ipRows.length === 0 ? (
            <div className="text-[11px] py-6 text-center rounded-xl border border-dashed" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
              {activeCohort?.code} isn&apos;t assigned to any IP in {week} yet — set that in{" "}
              <a href="/rotation" className="underline">
                Weekly Rotation
              </a>
              .
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ipRows.map((row) => (
                <div key={row.ipId} className="rounded-xl border p-3.5" style={{ borderColor: "var(--border)" }}>
                  <div className="text-[11px] font-bold">{row.ipName}</div>
                  <div className="text-[9.5px] mt-1" style={{ color: "var(--text-muted)" }}>
                    Weekly target: {row.target}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[9.5px]" style={{ color: "var(--text-muted)" }}>
                      Status
                    </span>
                    {activeCohort && (
                      <CohortWeeklyStatusPill monthKey={monthKey} cohortId={activeCohort.id} ipId={row.ipId} week={week} status={row.status} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHead
          title="Cohort Monthly Summary"
          subtitle="Assigned IP-weeks (target) vs. completed (Done = 1, Partial = 0.5), across W1–W4, net of trades"
        />
        <div>
          {summary.map(({ cohort, target, achieved, pct }) => (
            <div key={cohort.id} className="flex items-center justify-between gap-3 px-5 py-2.5 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
              <div className="text-[11px] font-bold min-w-[120px]">
                {cohort.code} · {cohort.leaderName}
              </div>
              <div className="flex-1">
                <ProgressBar pct={pct} />
              </div>
              <div className="text-[10.5px] tabular-nums min-w-[130px] text-right" style={{ color: "var(--text-muted)" }}>
                {achieved} / {target} IP-weeks · {pct}%
              </div>
            </div>
          ))}
          {summary.length === 0 && (
            <div className="text-center py-8 text-[11px]" style={{ color: "var(--text-muted)" }}>
              No rotation assignments yet
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
