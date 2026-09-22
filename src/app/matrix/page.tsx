import { PageHeader, Card, CardHead } from "@/components/ui";
import { MatrixFilters } from "@/components/MatrixFilters";
import { MatrixCell } from "@/components/MatrixCell";
import { ResetMatrixButton } from "@/components/ResetMatrixButton";
import { getClientMatrix } from "@/lib/queries";

export default async function MatrixPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string; ip?: string }>;
}) {
  const { cohort: cohortFilter, ip: ipFilter } = await searchParams;
  const { cohorts, ips } = await getClientMatrix();

  const visibleCohorts = cohortFilter ? cohorts.filter((c) => c.code === cohortFilter) : cohorts;
  const visibleIps = ipFilter ? ips.filter((ip) => ip.name === ipFilter) : ips;

  return (
    <div>
      <PageHeader
        title="Client × IP Status Matrix"
        subtitle="Cohort · Client · Cohort Leader · Status per IP"
        right={<MatrixFilters cohortCodes={cohorts.map((c) => c.code)} ipNames={ips.map((i) => i.name)} />}
      />
      <Card>
        <CardHead title="Status Matrix" subtitle="Click any cell to cycle Pending → Partial → Done — saved for everyone" right={<ResetMatrixButton />} />
        <div className="overflow-auto max-h-[75vh]">
          <table className="w-full border-collapse" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th
                  className="sticky left-0 z-10 text-left px-3 py-2 border-b text-[9px] uppercase tracking-wide"
                  style={{ background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-muted)", minWidth: 240 }}
                >
                  Cohort / Client / Leader
                </th>
                {visibleIps.map((ip) => (
                  <th
                    key={ip.id}
                    className="px-2 py-2 border-b text-[8.5px] uppercase tracking-wide text-center"
                    style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                  >
                    {ip.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleCohorts.flatMap((cohort) =>
                cohort.clients.map((client) => (
                  <tr key={client.id}>
                    <td
                      className="sticky left-0 z-10 px-3 py-2 border-b"
                      style={{ background: "var(--surface-raised)", borderColor: "var(--border)" }}
                    >
                      <div className="text-[11px] font-bold">{client.name}</div>
                      <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                        {cohort.code} · {cohort.leaderName}
                      </div>
                    </td>
                    {visibleIps.map((ip) => {
                      const status = client.statuses.find((s) => s.ipId === ip.id)?.status ?? "PENDING";
                      return (
                        <td key={ip.id} className="px-2 py-2 border-b text-center" style={{ borderColor: "var(--border)" }}>
                          <MatrixCell clientId={client.id} ipId={ip.id} status={status} />
                        </td>
                      );
                    })}
                  </tr>
                )),
              )}
              {visibleCohorts.every((c) => c.clients.length === 0) && (
                <tr>
                  <td colSpan={visibleIps.length + 1} className="text-center py-8 text-[11px]" style={{ color: "var(--text-muted)" }}>
                    No matching clients
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 text-[10px] border-t" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
          — Pending · ½ Partial · ✓ Done
        </div>
      </Card>
    </div>
  );
}
