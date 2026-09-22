"use client";

import { useTransition } from "react";
import { deleteTrade } from "@/lib/actions";

export function DeleteTradeButton({ tradeId }: { tradeId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("Delete this trade log entry?")) startTransition(() => deleteTrade(tradeId));
      }}
      className="text-[13px]"
      style={{ color: "var(--status-critical)", opacity: pending ? 0.5 : 1 }}
      title="Delete"
    >
      ✕
    </button>
  );
}
