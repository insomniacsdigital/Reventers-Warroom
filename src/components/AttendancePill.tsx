"use client";

import { useTransition } from "react";
import { setAttendance } from "@/lib/actions";
import { AttendanceStatus } from "@/generated/prisma/enums";

const NEXT: Record<string, AttendanceStatus | null> = {
  none: AttendanceStatus.PRESENT,
  PRESENT: AttendanceStatus.ABSENT,
  ABSENT: null,
};

const STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  none: { bg: "var(--gridline)", fg: "var(--text-muted)", label: "Not marked" },
  PRESENT: { bg: "var(--status-good-bg)", fg: "#0a6b0a", label: "Present" },
  ABSENT: { bg: "#f3d9d5", fg: "#a1382b", label: "Absent" },
};

export function AttendancePill({ personId, dateStr, status }: { personId: string; dateStr: string; status: AttendanceStatus | null }) {
  const [pending, startTransition] = useTransition();
  const key = status ?? "none";
  const s = STYLE[key];
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => setAttendance(personId, dateStr, NEXT[key]))}
      className="rounded-md px-2.5 py-1 text-[11px] font-bold"
      style={{ background: s.bg, color: s.fg, opacity: pending ? 0.5 : 1 }}
    >
      {s.label}
    </button>
  );
}
