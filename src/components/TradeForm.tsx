"use client";

import { useRef, useState, useTransition } from "react";
import { submitTrade } from "@/lib/actions";
import { WEEKS, type WeekKey } from "@/lib/dates";

export function TradeForm({
  monthKey,
  ips,
  cohorts,
  defaultIpId,
}: {
  monthKey: string;
  ips: { id: string; name: string }[];
  cohorts: { id: string; code: string }[];
  defaultIpId?: string;
}) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [ipId, setIpId] = useState(defaultIpId ?? ips[0]?.id ?? "");
  const [week, setWeek] = useState<WeekKey>("W1");
  const [released, setReleased] = useState("");
  const [claimed, setClaimed] = useState("");
  const [note, setNote] = useState("");

  const inputStyle: React.CSSProperties = {
    borderColor: "var(--border)",
    background: "var(--surface-1)",
    color: "var(--text-primary)",
  };

  const submit = () => {
    if (!released || !claimed) {
      alert("Pick both which cohort released the slot and which cohort claimed it.");
      return;
    }
    startTransition(async () => {
      await submitTrade({ monthKey, ipId, week, releasedCohortId: released, claimedCohortId: claimed, note });
      setNote("");
      setReleased("");
      setClaimed("");
    });
  };

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex gap-2 flex-wrap items-center px-5 py-3.5 border-b"
      style={{ borderColor: "var(--border)" }}
    >
      <select value={ipId} onChange={(e) => setIpId(e.target.value)} className="h-9 rounded-lg border px-2 text-[11px]" style={inputStyle}>
        {ips.map((ip) => (
          <option key={ip.id} value={ip.id}>
            {ip.name}
          </option>
        ))}
      </select>
      <select value={week} onChange={(e) => setWeek(e.target.value as WeekKey)} className="h-9 rounded-lg border px-2 text-[11px]" style={inputStyle}>
        {WEEKS.map((w) => (
          <option key={w} value={w}>
            {w}
          </option>
        ))}
      </select>
      <select value={released} onChange={(e) => setReleased(e.target.value)} className="h-9 rounded-lg border px-2 text-[11px]" style={inputStyle}>
        <option value="">Released by…</option>
        {cohorts.map((c) => (
          <option key={c.id} value={c.id}>
            {c.code}
          </option>
        ))}
      </select>
      <select value={claimed} onChange={(e) => setClaimed(e.target.value)} className="h-9 rounded-lg border px-2 text-[11px]" style={inputStyle}>
        <option value="">Claimed by…</option>
        {cohorts.map((c) => (
          <option key={c.id} value={c.id}>
            {c.code}
          </option>
        ))}
      </select>
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Reason (optional)"
        className="h-9 flex-1 min-w-[140px] rounded-lg border px-2.5 text-[11px]"
        style={inputStyle}
      />
      <button
        type="submit"
        disabled={pending}
        className="h-9 rounded-lg px-3.5 text-[11px] font-semibold text-white"
        style={{ background: "var(--brand-ink)", opacity: pending ? 0.6 : 1 }}
      >
        Log trade
      </button>
    </form>
  );
}
