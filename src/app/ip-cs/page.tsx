import { PageHeader, Card, CardHead, Pill } from "@/components/ui";
import { getIpcsGroups, getIpsWithRoster } from "@/lib/queries";

export default async function IpCsPage() {
  const [groups, ips] = await Promise.all([getIpcsGroups(), getIpsWithRoster()]);

  return (
    <div>
      <PageHeader title="IP CS Allocation" subtitle="Reference data — who owns each IP" />
      <Card className="mb-5">
        <CardHead title="By IP CS" subtitle="Mirrors the IP roster below" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
          {groups.map((g) => (
            <div key={g.ipcs} className="rounded-xl border p-3.5" style={{ borderColor: "var(--border)" }}>
              <div className="text-[11px] font-bold">{g.ipcs}</div>
              <div className="text-[9.5px] mt-1" style={{ color: "var(--text-muted)" }}>
                {g.ipNames.length} allocated IP{g.ipNames.length !== 1 ? "s" : ""}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {g.ipNames.map((name) => (
                  <Pill key={name}>{name}</Pill>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHead title="Full IP Roster" subtitle="IP CS, Designer and Editors per IP, plus this cycle's default weekly target" />
        <div className="overflow-auto">
          <table className="w-full border-collapse" style={{ minWidth: 700 }}>
            <thead>
              <tr>
                {["IP", "IP CS", "Designer", "Editor(s)", "Default weekly target"].map((h) => (
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
              {ips.map((ip) => (
                <tr key={ip.id}>
                  <td className="px-3 py-2.5 border-b text-[11px] font-bold" style={{ borderColor: "var(--border)" }}>
                    {ip.name}
                  </td>
                  <td className="px-3 py-2.5 border-b text-[11px]" style={{ borderColor: "var(--border)" }}>
                    {ip.ipcs}
                  </td>
                  <td className="px-3 py-2.5 border-b text-[11px]" style={{ borderColor: "var(--border)" }}>
                    {ip.designer}
                  </td>
                  <td className="px-3 py-2.5 border-b text-[11px]" style={{ borderColor: "var(--border)" }}>
                    {ip.editors.length ? ip.editors.join(", ") : "—"}
                  </td>
                  <td className="px-3 py-2.5 border-b text-[11px] tabular-nums" style={{ borderColor: "var(--border)" }}>
                    {ip.defaultWeeklyTarget}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
