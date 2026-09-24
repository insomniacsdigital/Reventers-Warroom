"use client";

import { useState, useTransition } from "react";
import { clockIn, clockOut, adminSetAttendance, adminDeleteAttendance } from "@/lib/actions";
import { inputStyle, primaryButtonStyle } from "@/components/ui";

export function ClockPanel({
  today,
  clockedInAt,
  clockedOutAt,
  missingDay,
}: {
  today: string;
  clockedInAt: string | null;
  clockedOutAt: string | null;
  /** An earlier day left without a clock-out. */
  missingDay: { day: string; clockIn: string } | null;
}) {
  const [pending, startTransition] = useTransition();
  const [previousOut, setPreviousOut] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const act = (fn: () => ReturnType<typeof clockOut>) =>
    startTransition(async () => {
      const r = await fn();
      setMessage(r.ok ? r.message ?? "Saved" : r.error);
    });

  const button = (label: string, onClick: () => void) => (
    <button
      type="button"
      disabled={pending}
      onClick={onClick}
      className="h-11 rounded-xl px-6 text-[13px] font-bold"
      style={{ ...primaryButtonStyle, opacity: pending ? 0.6 : 1 }}
    >
      {label}
    </button>
  );

  return (
    <div className="p-5">
      {!clockedInAt && (
        <>
          {missingDay && (
            <label className="block mb-4 rounded-xl border p-3.5" style={{ borderColor: "var(--status-warning)", background: "var(--status-warning-bg)" }}>
              <span className="block text-[12px] font-bold mb-1">
                You didn&apos;t clock out on {missingDay.day} (clocked in at {missingDay.clockIn}).
              </span>
              <span className="block text-[11px] mb-2" style={{ color: "var(--text-secondary)" }}>
                Enter the time you left that day, then clock in.
              </span>
              <input
                type="time"
                value={previousOut}
                onChange={(e) => setPreviousOut(e.target.value)}
                className="h-9 rounded-lg border px-2 text-[12px]"
                style={inputStyle}
                aria-label={`Clock-out time on ${missingDay.day}`}
              />
            </label>
          )}
          {button("Clock in", () => {
            if (missingDay && !previousOut) {
              setMessage(`Enter your clock-out time for ${missingDay.day} first.`);
              return;
            }
            act(() => clockIn(missingDay ? previousOut : null));
          })}
        </>
      )}
      {clockedInAt && !clockedOutAt && (
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-[13px]">
            Clocked in today at <b>{clockedInAt}</b>
          </div>
          {button("Clock out", () => act(() => clockOut()))}
        </div>
      )}
      {clockedInAt && clockedOutAt && (
        <div className="text-[13px]">
          Done for today ({today}): in at <b>{clockedInAt}</b>, out at <b>{clockedOutAt}</b>.
        </div>
      )}
      {message && (
        <p role="status" className="text-[11.5px] mt-3" style={{ color: "var(--text-secondary)" }}>
          {message}
        </p>
      )}
    </div>
  );
}

/** Admin: add or correct one day. */
export function AdminDayForm({
  personId,
  day,
  inTime,
  outTime,
  maxDay,
}: {
  personId: string;
  day?: string;
  inTime?: string;
  outTime?: string;
  maxDay: string;
}) {
  const [pending, startTransition] = useTransition();
  const [d, setD] = useState(day ?? maxDay);
  const [i, setI] = useState(inTime ?? "");
  const [o, setO] = useState(outTime ?? "");
  const editing = Boolean(day);
  return (
    <form
      className="flex flex-wrap items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await adminSetAttendance(personId, d, i, o);
          if (!r.ok) alert(r.error);
        });
      }}
    >
      {!editing && <input type="date" value={d} max={maxDay} onChange={(e) => setD(e.target.value)} className="h-8 rounded-lg border px-2 text-[11px]" style={inputStyle} aria-label="Date" />}
      <input type="time" value={i} onChange={(e) => setI(e.target.value)} className="h-8 rounded-lg border px-1.5 text-[11px]" style={inputStyle} aria-label="Clock in" required />
      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
        to
      </span>
      <input type="time" value={o} onChange={(e) => setO(e.target.value)} className="h-8 rounded-lg border px-1.5 text-[11px]" style={inputStyle} aria-label="Clock out" />
      <button type="submit" disabled={pending} className="h-8 rounded-lg px-2.5 text-[10.5px] font-semibold" style={{ ...primaryButtonStyle, opacity: pending ? 0.6 : 1 }}>
        {editing ? "Save" : "Add day"}
      </button>
      {editing && (
        <button
          type="button"
          disabled={pending}
          className="h-8 px-1.5 text-[12px]"
          style={{ color: "var(--status-critical)" }}
          title="Delete this day"
          aria-label="Delete this day"
          onClick={() => {
            if (!confirm(`Delete ${d}?`)) return;
            startTransition(async () => {
              const r = await adminDeleteAttendance(personId, d);
              if (!r.ok) alert(r.error);
            });
          }}
        >
          ✕
        </button>
      )}
    </form>
  );
}
