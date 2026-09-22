"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { monthKeyLabel } from "@/lib/dates";

export function MonthSwitcher({ monthKeys, current }: { monthKeys: string[]; current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const options = Array.from(new Set([...monthKeys, current])).sort();

  return (
    <select
      value={current}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("month", e.target.value);
        router.push(`${pathname}?${params.toString()}`);
      }}
      className="h-9 rounded-lg border px-2.5 text-[11px] font-medium"
      style={{ borderColor: "var(--border)", background: "var(--surface-raised)", color: "var(--text-primary)" }}
    >
      {options.map((key) => (
        <option key={key} value={key}>
          {monthKeyLabel(key)}
        </option>
      ))}
    </select>
  );
}
