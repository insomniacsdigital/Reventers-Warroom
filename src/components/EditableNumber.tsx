"use client";

import { useState, useTransition } from "react";

export function EditableNumber({
  value,
  onCommit,
  suffix,
}: {
  value: number;
  onCommit: (value: number) => Promise<void>;
  suffix?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [pending, startTransition] = useTransition();

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(String(value));
          setEditing(true);
        }}
        className="tabular-nums underline decoration-dotted underline-offset-2 cursor-text"
        style={{ color: "var(--text-primary)", background: "none", border: "none", font: "inherit", padding: 0 }}
        title="Click to edit"
      >
        {value}
        {suffix ?? ""}
      </button>
    );
  }

  const commit = () => {
    const parsed = parseInt(draft, 10);
    setEditing(false);
    if (!isNaN(parsed) && parsed !== value) {
      startTransition(() => onCommit(Math.max(0, parsed)));
    }
  };

  return (
    <input
      autoFocus
      type="number"
      min={0}
      value={draft}
      disabled={pending}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setEditing(false);
      }}
      className="w-14 rounded border px-1 py-0.5 text-[12px] tabular-nums"
      style={{ borderColor: "var(--border)", background: "var(--surface-raised)", color: "var(--text-primary)" }}
    />
  );
}
