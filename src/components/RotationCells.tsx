"use client";

import { EditableNumber } from "@/components/EditableNumber";
import { setRotationTarget, setRotationAchieved, toggleRotationCohort } from "@/lib/actions";
import type { WeekKey } from "@/lib/dates";

export function RotationTargetCell({ monthKey, ipId, week, target }: { monthKey: string; ipId: string; week: WeekKey; target: number }) {
  return <EditableNumber value={target} onCommit={(v) => setRotationTarget(monthKey, ipId, week, v)} />;
}

export function RotationAchievedCell({
  monthKey,
  ipId,
  week,
  achieved,
  target,
}: {
  monthKey: string;
  ipId: string;
  week: WeekKey;
  achieved: number;
  target: number;
}) {
  return (
    <span>
      <EditableNumber value={achieved} onCommit={(v) => setRotationAchieved(monthKey, ipId, week, v)} /> / {target}
    </span>
  );
}

export function CohortChip({
  monthKey,
  ipId,
  week,
  cohortId,
  cohortCode,
  active,
}: {
  monthKey: string;
  ipId: string;
  week: WeekKey;
  cohortId: string;
  cohortCode: string;
  active: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => toggleRotationCohort(monthKey, ipId, week, cohortId)}
      className="inline-block m-0.5 rounded-md border px-1.5 py-0.5 text-[9.5px] font-semibold"
      style={{
        borderColor: active ? "var(--brand-ink)" : "var(--border)",
        background: active ? "var(--brand-ink)" : "var(--surface-raised)",
        color: active ? "#fff" : "var(--text-secondary)",
      }}
    >
      {cohortCode}
    </button>
  );
}
