"use client";

import { StatusPill } from "@/components/StatusPill";
import { cycleCohortWeeklyStatus } from "@/lib/actions";
import type { StatusState } from "@/lib/enums";
import type { WeekKey } from "@/lib/dates";

export function CohortWeeklyStatusPill({
  monthKey,
  cohortId,
  ipId,
  week,
  status,
}: {
  monthKey: string;
  cohortId: string;
  ipId: string;
  week: WeekKey;
  status: StatusState;
}) {
  return <StatusPill status={status} onCycle={() => cycleCohortWeeklyStatus(monthKey, cohortId, ipId, week)} />;
}
