"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function CohortTabs({ cohorts, current }: { cohorts: { id: string; code: string }[]; current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className="flex gap-1.5 flex-wrap">
      {cohorts.map((c) => {
        const active = c.id === current;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("cohort", c.id);
              router.push(`${pathname}?${params.toString()}`);
            }}
            className="h-8 rounded-lg border px-3 text-[11px] font-semibold"
            style={{
              borderColor: active ? "var(--brand-ink)" : "var(--border)",
              background: active ? "var(--brand-ink)" : "var(--surface-raised)",
              color: active ? "#fff" : "var(--text-secondary)",
            }}
          >
            {c.code}
          </button>
        );
      })}
    </div>
  );
}
