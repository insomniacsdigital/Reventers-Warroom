import Link from "next/link";
import { PageHeader, Card, CardHead } from "@/components/ui";
import { MonthSwitcher } from "@/components/Switchers";
import { TradeForm } from "@/components/TradeForm";
import { DeleteTradeButton } from "@/components/DeleteTradeButton";
import { getTrades, listCycleMonthKeys, getIpTeams, getCohorts } from "@/lib/queries";
import { requireUser } from "@/lib/auth";
import { currentMonthKey } from "@/lib/dates";

export default async function TradesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; ip?: string }>;
}) {
  const user = await requireUser();
  const canTrade = user.isAdmin || user.appRole === "COHORT_LEADER";
  const params = await searchParams;
  const monthKey = params.month ?? currentMonthKey();

  const [trades, monthKeys, ips, cohorts] = await Promise.all([
    getTrades(monthKey, params.ip),
    listCycleMonthKeys(),
    getIpTeams(),
    getCohorts(),
  ]);
  const filteredIpName = params.ip ? ips.find((i) => i.id === params.ip)?.name : undefined;

  return (
    <div>
      <PageHeader
        title="Trade-off Log"
        subtitle="When a cohort has nothing to allocate to an IP that week, log who released the slot and who claimed it"
        right={<MonthSwitcher monthKeys={monthKeys} current={monthKey} />}
      />
      <Card>
        <CardHead title={canTrade ? "Log a trade" : "Trades"} subtitle={canTrade ? undefined : "Cohort leaders and admins log trades."} />
        {canTrade && (
          <TradeForm
            monthKey={monthKey}
            ips={ips.map((i) => ({ id: i.id, name: i.name }))}
            cohorts={cohorts.map((c) => ({ id: c.id, label: `${c.code} · ${c.leaderName}` }))}
            defaultIpId={params.ip}
          />
        )}
        <div className="flex items-center justify-between px-5 py-2.5 text-[10.5px]" style={{ color: "var(--text-muted)" }}>
          <span>{filteredIpName ? `Showing trades for ${filteredIpName}` : "Showing all trades"}</span>
          {params.ip && (
            <Link href={`/trades?month=${monthKey}`} className="underline">
              Show all
            </Link>
          )}
        </div>
        <div className="overflow-auto">
          <table className="w-full border-collapse" style={{ minWidth: 700 }}>
            <thead>
              <tr>
                {["Date", "IP", "Week", "Released by", "Claimed by", "Note", ""].map((h) => (
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
              {trades.map((t) => (
                <tr key={t.id}>
                  <td className="px-3 py-2.5 border-b text-[11px]" style={{ borderColor: "var(--border)" }}>
                    {t.createdAt.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" })}
                  </td>
                  <td className="px-3 py-2.5 border-b text-[11px]" style={{ borderColor: "var(--border)" }}>
                    {t.ip.name}
                  </td>
                  <td className="px-3 py-2.5 border-b text-[11px]" style={{ borderColor: "var(--border)" }}>
                    {t.week}
                  </td>
                  <td className="px-3 py-2.5 border-b text-[11px]" style={{ borderColor: "var(--border)" }}>
                    {t.releasedCohort.code} · {t.releasedCohort.leaderName}
                  </td>
                  <td className="px-3 py-2.5 border-b text-[11px]" style={{ borderColor: "var(--border)" }}>
                    {t.claimedCohort.code} · {t.claimedCohort.leaderName}
                  </td>
                  <td className="px-3 py-2.5 border-b text-[11px]" style={{ borderColor: "var(--border)" }}>
                    {t.note || "—"}
                  </td>
                  <td className="px-3 py-2.5 border-b text-center" style={{ borderColor: "var(--border)" }}>
                    {canTrade && <DeleteTradeButton tradeId={t.id} />}
                  </td>
                </tr>
              ))}
              {trades.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-[11px]" style={{ color: "var(--text-muted)" }}>
                    No trades logged yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
