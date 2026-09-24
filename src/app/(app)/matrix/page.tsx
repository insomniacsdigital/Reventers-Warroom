import { PageHeader, Card, CardHead, EmptyNote } from "@/components/ui";
import { MonthSwitcher, ParamSelect } from "@/components/Switchers";
import { MatrixCell } from "@/components/MatrixCell";
import { getMatrix } from "@/lib/queries";
import { requireUser } from "@/lib/auth";
import { statusFrom } from "@/lib/rotation";
import { currentMonthKey, yearMonths, yearStartFor } from "@/lib/dates";

export default async function MatrixPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string; ip?: string; month?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const now = currentMonthKey();
  const monthKey = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : now;
  const { cohorts, ips, cellMap } = await getMatrix(monthKey);

  const visibleCohorts = params.cohort ? cohorts.filter((c) => c.code === params.cohort) : cohorts;
  const visibleIps = params.ip ? ips.filter((ip) => ip.id === params.ip) : ips;
  const months = yearMonths(yearStartFor(now));

  let totalTarget = 0;
  let totalAchieved = 0;
  let totalLive = 0;
  for (const c of cellMap.values()) {
    totalTarget += c.target;
    totalAchieved += c.achieved;
    totalLive += c.live;
  }

  return (
    <div>
      <PageHeader
        title="Brand × IP Matrix"
        subtitle="Target · Achieved · Live for each brand and IP, per month. Achieved here is the IP output counted on the dashboard."
        right={
          <>
            <MonthSwitcher monthKeys={months} current={monthKey} />
            <ParamSelect
              param="cohort"
              label="Cohort"
              value={params.cohort ?? ""}
              options={[{ value: "", label: "All cohorts" }, ...cohorts.map((c) => ({ value: c.code, label: `${c.code} · ${c.leaderName}` }))]}
            />
            <ParamSelect
              param="ip"
              label="IP"
              value={params.ip ?? ""}
              options={[{ value: "", label: "All IPs" }, ...ips.map((ip) => ({ value: ip.id, label: ip.name }))]}
            />
          </>
        }
      />
      <Card>
        <CardHead
          title="Status matrix"
          subtitle="T = target (set by the cohort leader) · A = achieved · L = live (updated by the cohort leader or the IP's IP CS). Click a number to edit."
          right={
            <div className="text-[11px] tabular-nums text-right" style={{ color: "var(--text-secondary)" }}>
              Month total: <b>{totalAchieved}</b> achieved / <b>{totalTarget}</b> target · <b>{totalLive}</b> live
            </div>
          }
        />
        <div className="overflow-auto max-h-[75vh]">
          <table className="w-full border-collapse" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th
                  className="sticky left-0 top-0 z-20 text-left px-3 py-2 border-b text-[9px] uppercase tracking-wide"
                  style={{ background: "var(--surface-tint)", borderColor: "var(--border)", color: "var(--text-muted)", minWidth: 200 }}
                >
                  Brand · Cohort
                </th>
                {visibleIps.map((ip) => (
                  <th
                    key={ip.id}
                    className="sticky top-0 z-10 px-2 py-2 border-b text-[8.5px] uppercase tracking-wide text-center"
                    style={{ borderColor: "var(--border)", color: "var(--text-muted)", background: "var(--surface-tint)", minWidth: 76 }}
                  >
                    {ip.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleCohorts.flatMap((cohort) => {
                const leads = user.isAdmin || user.cohortIds.includes(cohort.id);
                return cohort.brands.map((brand) => (
                  <tr key={brand.id}>
                    <td
                      className="sticky left-0 z-10 px-3 py-2 border-b"
                      style={{ background: leads && !user.isAdmin ? "var(--brand-soft)" : "var(--surface-raised)", borderColor: "var(--border)" }}
                    >
                      <div className="text-[11px] font-bold">{brand.name}</div>
                      <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                        {cohort.code} · {cohort.leaderName}
                      </div>
                    </td>
                    {visibleIps.map((ip) => {
                      const cell = cellMap.get(`${brand.id}:${ip.id}`);
                      const target = cell?.target ?? 0;
                      const achieved = cell?.achieved ?? 0;
                      const live = cell?.live ?? 0;
                      return (
                        <td key={ip.id} className="px-1.5 py-1.5 border-b align-top" style={{ borderColor: "var(--border)" }}>
                          <MatrixCell
                            monthKey={monthKey}
                            brandId={brand.id}
                            ipId={ip.id}
                            target={target}
                            achieved={achieved}
                            live={live}
                            status={statusFrom(target, achieved)}
                            canTarget={leads}
                            canProgress={leads || user.ipcsIpIds.includes(ip.id)}
                            label={`${brand.name} ${ip.name}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ));
              })}
            </tbody>
          </table>
          {visibleCohorts.every((c) => c.brands.length === 0) && <EmptyNote>No matching brands</EmptyNote>}
        </div>
        <div className="px-5 py-3 text-[10px] border-t flex flex-wrap gap-4" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
          <span>Status comes from the numbers:</span>
          <span>blank = Pending (nothing achieved)</span>
          <span>
            <span className="inline-block w-2.5 h-2.5 rounded-sm align-middle mr-1" style={{ background: "var(--status-warning-bg)" }} />
            Partial
          </span>
          <span>
            <span className="inline-block w-2.5 h-2.5 rounded-sm align-middle mr-1" style={{ background: "var(--status-good-bg)" }} />
            Done (achieved ≥ target)
          </span>
          {!user.isAdmin && user.cohortIds.length > 0 && <span>Your cohort&apos;s brands are highlighted.</span>}
        </div>
      </Card>
    </div>
  );
}
