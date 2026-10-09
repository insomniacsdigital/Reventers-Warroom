"use client";

import { EditableNumber } from "@/components/EditableNumber";
import { setBrandIpValue } from "@/lib/actions";
import type { StatusState } from "@/lib/enums";

const TONE: Record<StatusState, string> = {
  PENDING: "transparent",
  PARTIAL: "var(--status-warning-bg)",
  DONE: "var(--status-good-bg)",
};

export function MatrixCell({
  monthKey,
  brandId,
  ipId,
  target,
  achieved,
  live,
  status,
  canTarget,
  canProgress,
  label,
}: {
  monthKey: string;
  brandId: string;
  ipId: string;
  target: number;
  achieved: number;
  live: number;
  status: StatusState;
  canTarget: boolean;
  canProgress: boolean;
  label: string;
}) {
  const row = (tag: string, field: "target" | "achieved" | "live", value: number, editable: boolean) => (
    <div className="flex items-center justify-between gap-1.5 text-[10.5px]">
      <span className="text-[8.5px] font-bold" style={{ color: "var(--text-muted)" }}>
        {tag}
      </span>
      <EditableNumber
        value={value}
        readOnly={!editable}
        label={`${label} ${field}`}
        onCommit={(v) => setBrandIpValue(monthKey, brandId, ipId, field, v ?? 0)}
      />
    </div>
  );
  return (
    <div className="rounded-md px-1.5 py-1 min-w-[58px]" style={{ background: TONE[status] }}>
      {row("T", "target", target, canTarget)}
      {row("A", "achieved", achieved, canProgress)}
      {row("L", "live", live, canProgress)}
    </div>
  );
}
