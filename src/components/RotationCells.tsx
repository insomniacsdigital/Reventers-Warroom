"use client";

import { useTransition } from "react";
import { EditableNumber } from "@/components/EditableNumber";
import { setIpWeeklyTarget, toggleRotationCohort } from "@/lib/actions";
import type { WeekKey } from "@/lib/dates";

export function WeeklyTargetCell({ monthKey, ipId, target, editable }: { monthKey: string; ipId: string; target: number; editable: boolean }) {
  return (
    <EditableNumber
      value={target}
      readOnly={!editable}
      label="weekly target"
      onCommit={(v) => setIpWeeklyTarget(monthKey, ipId, v ?? 0)}
    />
  );
}

export function CohortChip({
  monthKey,
  ipId,
  week,
  cohortId,
  label,
  active,
}: {
  monthKey: string;
  ipId: string;
  week: WeekKey;
  cohortId: string;
  label: string;
  active: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const r = await toggleRotationCohort(monthKey, ipId, week, cohortId);
          if (!r.ok) alert(r.error);
        })
      }
      className="inline-block m-0.5 rounded-md border px-1.5 py-0.5 text-[9.5px] font-semibold"
      style={{
        borderColor: active ? "var(--brand-ink)" : "var(--border)",
        background: active ? "var(--brand-ink)" : "var(--surface-raised)",
        color: active ? "#fff" : "var(--text-muted)",
        opacity: pending ? 0.5 : 1,
      }}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}
