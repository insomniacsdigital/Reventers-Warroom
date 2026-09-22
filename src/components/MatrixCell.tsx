"use client";

import { StatusPill } from "@/components/StatusPill";
import { cycleClientIpStatus } from "@/lib/actions";
import type { StatusState } from "@/generated/prisma/enums";

export function MatrixCell({ clientId, ipId, status }: { clientId: string; ipId: string; status: StatusState }) {
  return <StatusPill status={status} size="sm" onCycle={() => cycleClientIpStatus(clientId, ipId)} />;
}
