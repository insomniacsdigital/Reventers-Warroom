"use client";

import { useTransition } from "react";
import { resetClientIpStatuses } from "@/lib/actions";

export function ResetMatrixButton() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("Reset every client × IP status back to Pending for everyone? This can't be undone.")) {
          startTransition(() => resetClientIpStatuses());
        }
      }}
      className="text-[10px] underline"
      style={{ color: "var(--text-muted)", opacity: pending ? 0.5 : 1 }}
    >
      Reset all statuses to Pending
    </button>
  );
}
