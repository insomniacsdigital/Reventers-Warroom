import Link from "next/link";
import { PageHeader, Card, CardHead, KpiTile, ProgressBar } from "@/components/ui";
import { getKpis, getCohortOverview, getRotationView } from "@/lib/queries";
import { WEEKS, currentMonthKey, monthKeyLabel } from "@/lib/dates";

export default async function DashboardPage() {
  const monthKey = currentMonthKey();
  const [kpis, cohortOverview, rotation] = await Promise.all([
    getKpis(),
    getCohortOverview(),
    getRotationView(monthKey),
  ]);

  let totalTarget = 0;
  let totalAchieved = 0;
  for (const row of rotation.rows) {
    for (const week of WEEKS) {
      totalTarget += row.byWeek[week].target;
      totalAchieved += row.byWeek[week].achieved;
    }
  }
  const outputPct = totalTarget ? Math.round((totalAchieved / totalTarget) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="IP Production Command Center"
        subtitle="Cohort Leader → Client → IP CS → IP → Designer → Editor → Output"
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-3 mb-5">
        <Card className="p-5" >
          <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            {monthKeyLabel(monthKey)} · Real per-IP output vs. target
          </div>
          <div className="flex items-end gap-3 mt-2">
            <div className="text-[34px] font-extrabold tabular-nums leading-none">{totalAchieved}</div>
            <div className="text-[15px] pb-1" style={{ color: "var(--text-muted)" }}>/ {totalTarget} output units</div>
          </div>
          <div className="mt-3">
            <ProgressBar pct={outputPct} />
          </div>
          <div className="text-[10.5px] mt-2" style={{ color: "var(--text-muted)" }}>
            {outputPct}% of this cycle&apos;s combined per-IP targets (W1–W4) — set and edited per IP in{" "}
            <Link href="/rotation" className="underline">
              Weekly Rotation
            </Link>
            . No flat banner target; every IP carries its own weekly number.
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Cohorts on track
          </div>
          <div className="mt-2 flex flex-col gap-2">
            {cohortOverview.slice(0, 4).map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <span className="text-[10px] font-bold w-6" style={{ color: "var(--text-secondary)" }}>
                  {c.code}
                </span>
                <div className="flex-1">
                  <ProgressBar pct={c.pct} />
                </div>
                <span className="text-[10px] tabular-nums w-9 text-right" style={{ color: "var(--text-muted)" }}>
                  {c.pct}%
                </span>
              </div>
            ))}
          </div>
          <Link href="/cohort-progress" className="text-[10px] underline mt-3 inline-block" style={{ color: "var(--text-muted)" }}>
            See full cohort weekly progress →
          </Link>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KpiTile label="Cohorts" value={kpis.cohorts} meta="C1 – C7" />
        <KpiTile label="Clients" value={kpis.clients} meta="Mapped to cohorts" />
        <KpiTile label="IPs" value={kpis.ips} meta="Content formats" />
        <KpiTile label="IP CS" value={kpis.ipcs} meta="Allocation team" />
        <KpiTile label="Designers" value={kpis.designers} meta="Allocation sheet" />
        <KpiTile label="Editors" value={kpis.editors} meta="Allocation sheet" />
      </div>

      <Card>
        <CardHead title="Cohort Overview" subtitle="Cohort Leader = person responsible for the cohort" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4">
          {cohortOverview.map((c) => (
            <Link
              key={c.id}
              href={`/matrix?cohort=${c.code}`}
              className="rounded-xl border p-3.5 block hover:border-[var(--brand-ink)] transition-colors"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[12px] font-bold">{c.code}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {c.leaderName} · {c.clientCount} clients
                  </div>
                </div>
                <div className="text-[13px] font-extrabold tabular-nums">{c.pct}%</div>
              </div>
              <div className="mt-2.5">
                <ProgressBar pct={c.pct} />
              </div>
              <div className="flex justify-between text-[9.5px] mt-1.5" style={{ color: "var(--text-muted)" }}>
                <span>{c.done} done</span>
                <span>{c.total} IP tasks</span>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
