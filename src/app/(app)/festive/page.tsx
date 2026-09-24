import { PageHeader, Card, CardHead, KpiTile, Th, Td, EmptyNote } from "@/components/ui";
import { MonthSwitcher, ParamSelect } from "@/components/Switchers";
import { AddFestiveForm, FestiveNumber, NonIpNumber, RemoveFestiveButton } from "@/components/FestiveControls";
import { getFestiveView } from "@/lib/queries";
import { requireUser } from "@/lib/auth";
import { currentMonthKey, monthKeyLabel, yearMonths, yearStartFor } from "@/lib/dates";
import { FestiveFormat } from "@/generated/prisma/enums";

const FORMATS: { key: FestiveFormat; label: string }[] = [
  { key: FestiveFormat.STATIC, label: "Statics" },
  { key: FestiveFormat.STORY, label: "Stories" },
  { key: FestiveFormat.REEL, label: "Reels" },
];

export default async function FestivePage({ searchParams }: { searchParams: Promise<{ month?: string; cohort?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const now = currentMonthKey();
  const monthKey = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : now;
  const view = await getFestiveView(monthKey);

  // Cohort leaders land on their own cohort; everyone can switch to see others.
  const defaultCohort = !user.isAdmin && user.cohortIds.length ? view.cohorts.find((c) => c.id === user.cohortIds[0])?.code ?? "" : "";
  const cohortCode = params.cohort ?? defaultCohort;
  const cohorts = cohortCode ? view.cohorts.filter((c) => c.code === cohortCode) : view.cohorts;
  const canEdit = (cohortId: string) => user.isAdmin || user.cohortIds.includes(cohortId);
  const editableBrands = cohorts.filter((c) => canEdit(c.id)).flatMap((c) => c.brands.map((b) => ({ id: b.id, label: `${b.name} (${c.leaderName})` })));
  const brandInfo = new Map(view.cohorts.flatMap((c) => c.brands.map((b) => [b.id, { name: b.name, cohort: c }] as const)));
  const shownGroups = view.festiveGroups
    .filter((g) => cohorts.some((c) => c.id === brandInfo.get(g.brandId)?.cohort.id))
    .sort((a, b) => (brandInfo.get(a.brandId)?.name ?? "").localeCompare(brandInfo.get(b.brandId)?.name ?? "") || a.festivalName.localeCompare(b.festivalName));

  const festiveTotal = FORMATS.reduce(
    (s, f) => ({
      target: s.target + view.byFormat[f.key].target,
      achieved: s.achieved + view.byFormat[f.key].achieved,
      live: s.live + view.byFormat[f.key].live,
    }),
    { target: 0, achieved: 0, live: 0 },
  );

  return (
    <div>
      <PageHeader
        title="Festive & Non-IP"
        subtitle="Cohort leaders plan each brand's festive and non-IP work at the start of the month, then track achieved and live. Handled by the floaters; not part of the IP target."
        right={
          <>
            <MonthSwitcher monthKeys={yearMonths(yearStartFor(now))} current={monthKey} />
            <ParamSelect
              param="cohort"
              label="Cohort"
              value={cohortCode}
              options={[{ value: "", label: "All cohorts" }, ...view.cohorts.map((c) => ({ value: c.code, label: `${c.code} · ${c.leaderName}` }))]}
            />
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        <KpiTile label="Festive target" value={festiveTotal.target} meta={`${festiveTotal.achieved} achieved · ${festiveTotal.live} live`} />
        {FORMATS.map((f) => (
          <KpiTile key={f.key} label={f.label} value={view.byFormat[f.key].target} meta={`${view.byFormat[f.key].achieved} achieved · ${view.byFormat[f.key].live} live`} />
        ))}
        <KpiTile label="Non-IP target" value={view.nonIpTotal.target} meta={`${view.nonIpTotal.achieved} achieved · ${view.nonIpTotal.live} live`} />
        <KpiTile
          label="Total planned"
          value={festiveTotal.target + view.nonIpTotal.target}
          meta={`Whole team, ${monthKeyLabel(monthKey, "short")}`}
        />
      </div>

      <Card className="mb-5">
        <CardHead title="Festive" subtitle="One row per brand and festival · T = target · A = achieved · L = live" />
        {editableBrands.length > 0 && (
          <AddFestiveForm monthKey={monthKey} brands={editableBrands} festivals={view.festivals} defaultMonth={Number(monthKey.slice(5, 7))} />
        )}
        <div className="overflow-auto">
          <table className="w-full border-collapse" style={{ minWidth: 980 }}>
            <thead>
              <tr>
                <Th>Brand</Th>
                <Th>Festival</Th>
                {FORMATS.map((f) => (
                  <Th key={f.key} align="center" className="border-l">
                    {f.label} · T / A / L
                  </Th>
                ))}
                <Th />
              </tr>
            </thead>
            <tbody>
              {shownGroups.map((g) => {
                const info = brandInfo.get(g.brandId);
                const editable = info ? canEdit(info.cohort.id) : false;
                return (
                  <tr key={`${g.brandId}:${g.festivalId}`}>
                    <Td>
                      <div className="font-bold">{info?.name}</div>
                      <div className="text-[9.5px]" style={{ color: "var(--text-muted)" }}>
                        {info?.cohort.code} · {info?.cohort.leaderName}
                      </div>
                    </Td>
                    <Td>
                      <div className="font-semibold">{g.festivalName}</div>
                      <div className="text-[9.5px]" style={{ color: "var(--text-muted)" }}>
                        {g.dateLabel}
                      </div>
                    </Td>
                    {FORMATS.map((f) => {
                      const cell = g.formats[f.key] ?? { target: 0, achieved: 0, live: 0 };
                      return (
                        <Td key={f.key} align="center" className="border-l tabular-nums whitespace-nowrap">
                          {(["target", "achieved", "live"] as const).map((field, i) => (
                            <span key={field}>
                              {i > 0 && <span style={{ color: "var(--text-muted)" }}> / </span>}
                              <FestiveNumber
                                monthKey={monthKey}
                                brandId={g.brandId}
                                festivalId={g.festivalId}
                                format={f.key}
                                field={field}
                                value={cell[field]}
                                editable={editable}
                              />
                            </span>
                          ))}
                        </Td>
                      );
                    })}
                    <Td align="center">{editable && <RemoveFestiveButton monthKey={monthKey} brandId={g.brandId} festivalId={g.festivalId} />}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {shownGroups.length === 0 && (
            <EmptyNote>No festive work planned for {monthKeyLabel(monthKey)} yet{editableBrands.length ? " — add a brand and festival above." : "."}</EmptyNote>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-5">
        <Card>
          <CardHead title="Non-IP" subtitle="Outputs required per brand, no format split" />
          <div className="overflow-auto max-h-[70vh]">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Brand</Th>
                  <Th align="right">Target</Th>
                  <Th align="right">Achieved</Th>
                  <Th align="right">Live</Th>
                </tr>
              </thead>
              <tbody>
                {cohorts.flatMap((c) =>
                  c.brands.map((b) => {
                    const n = view.nonIpByBrand.get(b.id);
                    const editable = canEdit(c.id);
                    return (
                      <tr key={b.id}>
                        <Td>
                          <span className="font-bold">{b.name}</span>
                          <span className="text-[9.5px] ml-1.5" style={{ color: "var(--text-muted)" }}>
                            {c.leaderName}
                          </span>
                        </Td>
                        {(["target", "achieved", "live"] as const).map((field) => (
                          <Td key={field} align="right" className="tabular-nums">
                            <NonIpNumber monthKey={monthKey} brandId={b.id} field={field} value={n?.[field] ?? 0} editable={editable} />
                          </Td>
                        ))}
                      </tr>
                    );
                  }),
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHead title="Bandwidth plan" subtitle={`Festive targets by festival and format, ${monthKeyLabel(monthKey)} (whole team)`} />
          <div className="overflow-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Festival</Th>
                  {FORMATS.map((f) => (
                    <Th key={f.key} align="right">
                      {f.label}
                    </Th>
                  ))}
                  <Th align="right">Total</Th>
                </tr>
              </thead>
              <tbody>
                {view.byFestival.map((f) => (
                  <tr key={f.name}>
                    <Td>
                      <span className="font-semibold">{f.name}</span>
                      <span className="text-[9.5px] ml-1.5" style={{ color: "var(--text-muted)" }}>
                        {f.dateLabel}
                      </span>
                    </Td>
                    <Td align="right" className="tabular-nums">{f.STATIC}</Td>
                    <Td align="right" className="tabular-nums">{f.STORY}</Td>
                    <Td align="right" className="tabular-nums">{f.REEL}</Td>
                    <Td align="right" className="tabular-nums font-bold">{f.STATIC + f.STORY + f.REEL}</Td>
                  </tr>
                ))}
                <tr style={{ background: "var(--surface-tint)" }}>
                  <Td className="font-extrabold">Festive total</Td>
                  {FORMATS.map((f) => (
                    <Td key={f.key} align="right" className="tabular-nums font-bold">
                      {view.byFormat[f.key].target}
                    </Td>
                  ))}
                  <Td align="right" className="tabular-nums font-extrabold">{festiveTotal.target}</Td>
                </tr>
                <tr>
                  <Td className="font-extrabold">Non-IP total</Td>
                  <Td />
                  <Td />
                  <Td />
                  <Td align="right" className="tabular-nums font-extrabold">{view.nonIpTotal.target}</Td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
