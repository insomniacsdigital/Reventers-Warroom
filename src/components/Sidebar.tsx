"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside
      className="hidden md:flex md:flex-col md:w-[220px] shrink-0 border-r px-4 py-6 gap-1"
      style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}
    >
      <div className="px-2 pb-5">
        <div className="text-[13px] font-bold leading-tight" style={{ color: "var(--brand-ink)" }}>
          IP Production
        </div>
        <div className="text-[13px] font-bold leading-tight" style={{ color: "var(--brand-ink)" }}>
          Command Center
        </div>
      </div>
      {NAV.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg px-3 py-2 text-[12.5px] font-medium transition-colors"
            style={{
              background: active ? "var(--brand-ink)" : "transparent",
              color: active ? "#fff" : "var(--text-secondary)",
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </aside>
  );
}
