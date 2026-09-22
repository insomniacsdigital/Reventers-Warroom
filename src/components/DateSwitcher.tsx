"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function DateSwitcher({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return (
    <input
      type="date"
      value={current}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("date", e.target.value);
        router.push(`${pathname}?${params.toString()}`);
      }}
      className="h-9 rounded-lg border px-2.5 text-[11px]"
      style={{ borderColor: "var(--border)", background: "var(--surface-raised)", color: "var(--text-primary)" }}
    />
  );
}
