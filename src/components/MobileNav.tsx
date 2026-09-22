"use client";

import { useRouter, usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/matrix", label: "Client × IP Matrix" },
  { href: "/rotation", label: "Weekly Rotation" },
  { href: "/cohort-progress", label: "Cohort Progress" },
  { href: "/trades", label: "Trade-off Log" },
  { href: "/ip-cs", label: "IP CS Allocation" },
  { href: "/attendance", label: "Attendance" },
  { href: "/trends", label: "Trends" },
];

export function MobileNav() {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <div
      className="md:hidden sticky top-0 z-20 border-b px-4 py-2.5"
      style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}
    >
      <select
        value={pathname}
        onChange={(e) => router.push(e.target.value)}
        className="h-9 w-full rounded-lg border px-2.5 text-[12px] font-medium"
        style={{ borderColor: "var(--border)", background: "var(--surface-raised)", color: "var(--text-primary)" }}
      >
        {NAV.map((item) => (
          <option key={item.href} value={item.href}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );
}
