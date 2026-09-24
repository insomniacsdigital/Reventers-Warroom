"use client";

import { useTransition } from "react";
import type { StatusState } from "@/generated/prisma/enums";
import type { ActionResult } from "@/lib/actions";

const STYLE: Record<StatusState, { bg: string; fg: string; label: string; short: string }> = {
  PENDING: { bg: "var(--gridline)", fg: "var(--text-secondary)", label: "Pending", short: "—" },
  PARTIAL: { bg: "var(--status-warning-bg)", fg: "#8a5a00", label: "Partial", short: "½" },
  DONE: { bg: "var(--status-good-bg)", fg: "#0a6b0a", label: "Done", short: "✓" },
};

export function StatusPill({
  status,
  onCycle,
  size = "md",
}: {
  status: StatusState;
  onCycle: () => Promise<ActionResult>;
  size?: "sm" | "md";
}) {
  const [pending, startTransition] = useTransition();
  const s = STYLE[status];
  const isSm = size === "sm";
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const r = await onCycle();
          if (!r.ok) alert(r.error);
        })
      }
      className="inline-flex items-center justify-center rounded-md font-bold border border-transparent transition-opacity"
      style={{
        background: s.bg,
        color: s.fg,
        opacity: pending ? 0.5 : 1,
        fontSize: isSm ? 10 : 11,
        padding: isSm ? "3px 7px" : "5px 10px",
        minWidth: isSm ? 24 : undefined,
        cursor: "pointer",
      }}
      title="Click to cycle status"
    >
      {isSm ? s.short : s.label}
    </button>
  );
}
