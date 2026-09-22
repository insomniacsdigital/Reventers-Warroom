"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { WEEKS } from "@/lib/dates";

export function WeekTabs({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className="flex gap-1.5">
      {WEEKS.map((week) => {
        const active = week === current;
        return (
          <button
            key={week}
            type="button"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("week", week);
              router.push(`${pathname}?${params.toString()}`);
            }}
            className="h-8 rounded-lg border px-3 text-[11px] font-semibold"
            style={{
              borderColor: active ? "var(--brand-ink)" : "var(--border)",
              background: active ? "var(--brand-ink)" : "var(--surface-raised)",
              color: active ? "#fff" : "var(--text-secondary)",
            }}
          >
            {week}
          </button>
        );
      })}
    </div>
  );
}
