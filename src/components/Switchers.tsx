"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { monthKeyLabel, yearLabel } from "@/lib/dates";

function useSetParam() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  };
}

const selectClass = "h-9 rounded-lg border px-2.5 text-[11px] font-medium";
const selectStyle: React.CSSProperties = { borderColor: "var(--border)", background: "var(--surface-raised)", color: "var(--text-primary)" };

export function YearSwitcher({ years, current }: { years: number[]; current: number }) {
  const setParam = useSetParam();
  return (
    <select value={current} onChange={(e) => setParam("year", e.target.value)} className={selectClass} style={selectStyle} aria-label="Year">
      {years.map((y) => (
        <option key={y} value={y}>
          {yearLabel(y)}
        </option>
      ))}
    </select>
  );
}

export function MonthSwitcher({ monthKeys, current }: { monthKeys: string[]; current: string }) {
  const setParam = useSetParam();
  const options = Array.from(new Set([...monthKeys, current])).sort();
  return (
    <select value={current} onChange={(e) => setParam("month", e.target.value)} className={selectClass} style={selectStyle} aria-label="Month">
      {options.map((key) => (
        <option key={key} value={key}>
          {monthKeyLabel(key)}
        </option>
      ))}
    </select>
  );
}

export function ParamSelect({
  param,
  value,
  options,
  label,
}: {
  param: string;
  value: string;
  options: { value: string; label: string }[];
  label: string;
}) {
  const setParam = useSetParam();
  return (
    <select value={value} onChange={(e) => setParam(param, e.target.value)} className={selectClass} style={selectStyle} aria-label={label}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
