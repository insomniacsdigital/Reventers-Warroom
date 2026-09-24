import Link from "next/link";
import { PageHeader, Card, CardHead, KpiTile, ProgressBar, Th, Td } from "@/components/ui";
import { YearSwitcher } from "@/components/Switchers";
import { getKpis, getCohortOverview, getIpTeams } from "@/lib/queries";
import { getYearSummary } from "@/lib/targets";
import { currentMonthKey, monthKeyLabel, yearLabel, yearStartFor } from "@/lib/dates";
import { requireUser } from "@/lib/auth";

function fmt(n: number | null) {
  return n === null ? "—" : n.toLocaleString("en-IN");
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const monthKey = currentMonthKey();
  const thisYear = yearStartFor(monthKey);
  const requested = Number(params.year);
  const startYear = Number.isInteger(requested) && requested > 2000 && requested < 2100 ? requested : thisYear;

  const [kpis, cohortOverview, teams, year] = await Promise.all([
    getKpis(),
    getCohortOverview(monthKey),
    getIpTeams(),
    getYearSummary(startYear),
  ]);
  const thisYearSummary = startYear === thisYear ? year : await getYearSummary(thisYear);
  const years = Array.from(new Set([thisYear - 1, thisYear, thisYear + 1, startYear])).sort();
  const currentRow = thisYearSummary.current;

  return (
    <div>
      <PageHeader
        title="IP Production Command Center"
        subtitle="Cohort Leader → Brand → IP CS → IP → Designer → Editor → Output"
        right={<YearSwitcher years={years} current={startYear} />}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 mb-5">
        <KpiTile label="Cohorts" value={kpis.cohorts} meta="Cohort leaders" />
        <KpiTile label="Brands" value={kpis.brands} meta="Across all cohorts" />
        <KpiTile label="IPs" value={kpis.ips} meta="Content formats" />
        <KpiTile label="Yearly target" value={fmt(thisYearSummary.totals.base)} meta={`IP base, ${yearLabel(thisYear)}`} />
        <KpiTile
          label="Monthly target"
          value={fmt(currentRow?.target ?? null)}
          meta={currentRow ? `${monthKeyLabel(monthKey, "short")} · incl. ${fmt(currentRow.backlogIn ?? 0)} backlog` : undefined}
        />
        <KpiTile label="IP CS" value={kpis.ipcs} meta="Allocation team" />
        <KpiTile label="Designers" value={kpis.designers} meta="IP designers" />
        <KpiTile label="Editors" value={kpis.editors} meta={`+ ${kpis.floaters} floaters (Festive & Non-IP)`} />
      </div>

      <Card className="mb-5">
        <CardHead
          title={`Yearly delivery · ${yearLabel(startYear)}`}
          subtitle="IP target = monthly base + any shortfall carried from earlier months (a surplus doesn't lower it). Festive and Non-IP are tracked separately and aren't part of the IP target."
        />
        <div className="overflow-auto">
          <table className="w-full border-collapse" style={{ minWidth: 1100 }}>
            <thead>
              <tr>
                <Th />
                <Th align="center" className="border-l">
                  <span style={{ color: "var(--brand-ink)" }}>IP output</span>
                </Th>
                <Th />
                <Th />
                <Th />
                <Th />
                <Th />
                <Th align="center" className="border-l">
                  Festive
                </Th>
                <Th />
                <Th />
                <Th align="center" className="border-l">
                  Non-IP
                </Th>
                <Th />
                <Th />
                <Th align="right" className="border-l">
                  All delivery
                </Th>
              </tr>
              <tr>
                <Th>Month</Th>
                <Th align="right" className="border-l">Base</Th>
                <Th align="right">Backlog in</Th>
                <Th align="right">Target</Th>
                <Th align="right">Achieved</Th>
                <Th align="right">Gap</Th>
                <Th align="right">Live</Th>
                <Th align="right" className="border-l">Target</Th>
                <Th align="right">Achieved</Th>
                <Th align="right">Live</Th>
                <Th align="right" className="border-l">Target</Th>
                <Th align="right">Achieved</Th>
                <Th align="right">Live</Th>
                <Th align="right" className="border-l">Achieved</Th>
              </tr>
            </thead>
            <tbody>
              {year.rows.map((r) => {
                const behind = r.timing === "past" && (r.gap ?? 0) > 0;
                const bg = r.timing === "current" ? "var(--brand-soft)" : behind ? "var(--status-critical-bg)" : undefined;
                return (
                  <tr key={r.monthKey} style={{ background: bg }}>
                    <Td className="font-bold whitespace-nowrap">
                      {monthKeyLabel(r.monthKey, "short")}
                      {r.timing === "current" && (
                        <span className="ml-1.5 text-[9px] font-bold uppercase" style={{ color: "var(--brand-ink)" }}>
                          now
                        </span>
                      )}
                    </Td>
                    <Td align="right" className="tabular-nums border-l" style={{ color: "var(--text-secondary)" }}>
                      {fmt(r.base)}
                      {r.baseIsOverride ? " *" : r.newBrands ? ` (+${r.newBrands} br.)` : ""}
                    </Td>
                    <Td align="right" className="tabular-nums">{r.backlogIn === null ? "—" : fmt(r.backlogIn)}</Td>
                    <Td align="right" className="tabular-nums font-bold">{r.timing === "future" && r.backlogIn === null ? `${fmt(r.base)}+` : fmt(r.target)}</Td>
                    <Td align="right" className="tabular-nums font-bold">
                      {r.timing === "future" ? "—" : fmt(r.achieved)}
                      {r.achievedIsOverride ? " *" : ""}
                    </Td>
                    <Td
                      align="right"
                      className="tabular-nums font-bold"
                      style={{ color: r.gap === null ? undefined : r.gap > 0 ? "var(--status-critical)" : "var(--status-good)" }}
                    >
                      {r.gap === null ? "—" : r.gap > 0 ? `−${fmt(r.gap)}` : r.gap < 0 ? `+${fmt(-r.gap)}` : "0"}
                    </Td>
                    <Td align="right" className="tabular-nums">{r.timing === "future" ? "—" : fmt(r.ipLive)}</Td>
                    <Td align="right" className="tabular-nums border-l">{fmt(r.festive.target)}</Td>
                    <Td align="right" className="tabular-nums">{fmt(r.festive.achieved)}</Td>
                    <Td align="right" className="tabular-nums">{fmt(r.festive.live)}</Td>
                    <Td align="right" className="tabular-nums border-l">{fmt(r.nonIp.target)}</Td>
                    <Td align="right" className="tabular-nums">{fmt(r.nonIp.achieved)}</Td>
                    <Td align="right" className="tabular-nums">{fmt(r.nonIp.live)}</Td>
                    <Td align="right" className="tabular-nums font-bold border-l">
                      {r.timing === "future" ? "—" : fmt(r.achieved + r.festive.achieved + r.nonIp.achieved)}
                    </Td>
                  </tr>
                );
              })}
              <tr style={{ background: "var(--surface-tint)" }}>
                <Td className="font-extrabold">Year</Td>
                <Td align="right" className="tabular-nums font-bold border-l">{fmt(year.totals.base)}</Td>
                <Td />
                <Td />
                <Td align="right" className="tabular-nums font-extrabold">{fmt(year.totals.achieved)}</Td>
                <Td />
                <Td align="right" className="tabular-nums font-bold">{fmt(year.totals.ipLive)}</Td>
                <Td align="right" className="tabular-nums font-bold border-l">{fmt(year.totals.festive.target)}</Td>
                <Td align="right" className="tabular-nums font-bold">{fmt(year.totals.festive.achieved)}</Td>
                <Td align="right" className="tabular-nums font-bold">{fmt(year.totals.festive.live)}</Td>
                <Td align="right" className="tabular-nums font-bold border-l">{fmt(year.totals.nonIp.target)}</Td>
                <Td align="right" className="tabular-nums font-bold">{fmt(year.totals.nonIp.achieved)}</Td>
                <Td align="right" className="tabular-nums font-bold">{fmt(year.totals.nonIp.live)}</Td>
                <Td align="right" className="tabular-nums font-extrabold border-l">
                  {fmt(year.totals.achieved + year.totals.festive.achieved + year.totals.nonIp.achieved)}
                </Td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 text-[10px] border-t flex flex-wrap gap-x-5 gap-y-1" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
          <span>
            Base = {fmt(year.settings.baseMonthly)} a month + {year.settings.perBrand} per brand added after launch. Achieved = the Brand × IP Matrix.
          </span>
          <span>* set by an admin</span>
          <span>
            <span className="inline-block w-2.5 h-2.5 rounded-sm align-middle mr-1" style={{ background: "var(--status-critical-bg)" }} />
            behind target
          </span>
          {user.isAdmin && (
            <Link href="/admin?tab=targets" className="underline" style={{ color: "var(--brand-ink)" }}>
              Edit targets or past months
            </Link>
          )}
        </div>
      </Card>

      <Card className="mb-5">
        <CardHead title="Cohort Overview" subtitle={`Cohort leader = person responsible for the cohort · IP delivery for ${monthKeyLabel(monthKey)}, from the Brand × IP Matrix`} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4">
          {cohortOverview.map((c) => (
            <Link
              key={c.id}
              href={`/matrix?cohort=${c.code}`}
              className="rounded-xl border p-3.5 block transition-colors hover:border-[var(--brand-ink)]"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[12px] font-bold">
                    {c.code} · {c.leaderName}
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {c.brandCount} brands
                  </div>
                </div>
                <div className="text-[13px] font-extrabold tabular-nums">{c.pct}%</div>
              </div>
              <div className="mt-2.5">
                <ProgressBar pct={c.pct} />
              </div>
              <div className="flex justify-between text-[9.5px] mt-1.5" style={{ color: "var(--text-muted)" }}>
                <span>
                  {c.achieved} achieved · {c.live} live
                </span>
                <span>{c.target} target</span>
              </div>
            </Link>
          ))}
        </div>
      </Card>

      <Card>
        <CardHead title="Who handles which IP" subtitle="IP CS · Designer · Editors" />
        <div className="overflow-auto">
          <table className="w-full border-collapse" style={{ minWidth: 760 }}>
            <thead>
              <tr>
                <Th>IP</Th>
                <Th>IP CS</Th>
                <Th>Designer</Th>
                <Th>Editors</Th>
                <Th align="right">Weekly target</Th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <tr key={t.id}>
                  <Td className="font-bold">{t.name}</Td>
                  <Td>{t.ipcs.join(" + ") || "—"}</Td>
                  <Td>{t.designers.join(" / ") || "Cohort designers"}</Td>
                  <Td>{t.editors.join(", ") || "—"}</Td>
                  <Td align="right" className="tabular-nums">{t.weeklyTarget}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
