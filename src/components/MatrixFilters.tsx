"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function MatrixFilters({
  cohortCodes,
  ipNames,
}: {
  cohortCodes: string[];
  ipNames: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const cohort = searchParams.get("cohort") ?? "all";
  const ip = searchParams.get("ip") ?? "all";

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete(key);
    else params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  };

  const selectStyle: React.CSSProperties = {
    borderColor: "var(--border)",
    background: "var(--surface-raised)",
    color: "var(--text-primary)",
  };

  return (
    <div className="flex gap-2 flex-wrap">
      <select
        value={cohort}
        onChange={(e) => setParam("cohort", e.target.value)}
        className="h-9 rounded-lg border px-2.5 text-[11px] font-medium"
        style={selectStyle}
      >
        <option value="all">All cohorts</option>
        {cohortCodes.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <select
        value={ip}
        onChange={(e) => setParam("ip", e.target.value)}
        className="h-9 rounded-lg border px-2.5 text-[11px] font-medium"
        style={selectStyle}
      >
        <option value="all">All IPs</option>
        {ipNames.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      {(cohort !== "all" || ip !== "all") && (
        <button
          type="button"
          onClick={() => router.push(pathname)}
          className="h-9 rounded-lg border px-3 text-[11px] font-medium"
          style={selectStyle}
        >
          Reset filters
        </button>
      )}
    </div>
  );
}
