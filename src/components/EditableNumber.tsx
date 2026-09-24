"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/lib/actions";

/**
 * A number that becomes an input on click and saves on Enter / blur.
 * With `readOnly` it's plain text. With `allowEmpty`, clearing it saves null.
 */
export function EditableNumber({
  value,
  onCommit,
  readOnly = false,
  allowEmpty = false,
  placeholder = "—",
  label,
}: {
  value: number | null;
  onCommit: (value: number | null) => Promise<ActionResult>;
  readOnly?: boolean;
  allowEmpty?: boolean;
  placeholder?: string;
  label?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value === null ? "" : String(value));
  const [pending, startTransition] = useTransition();

  if (readOnly) {
    return <span className="tabular-nums">{value ?? placeholder}</span>;
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(value === null ? "" : String(value));
          setEditing(true);
        }}
        className="tabular-nums underline decoration-dotted underline-offset-2 cursor-text"
        style={{ color: "var(--text-primary)", background: "none", border: "none", font: "inherit", padding: 0, opacity: pending ? 0.5 : 1 }}
        title="Click to edit"
        aria-label={label ? `Edit ${label}` : undefined}
      >
        {value ?? placeholder}
      </button>
    );
  }

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    let next: number | null;
    if (trimmed === "") {
      if (!allowEmpty) return;
      next = null;
    } else {
      const parsed = parseInt(trimmed, 10);
      if (isNaN(parsed)) return;
      next = Math.max(0, parsed);
    }
    if (next === value) return;
    startTransition(async () => {
      const result = await onCommit(next);
      if (!result.ok) alert(result.error);
    });
  };

  return (
    <input
      autoFocus
      type="number"
      min={0}
      value={draft}
      aria-label={label}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setEditing(false);
      }}
      className="w-16 rounded border px-1 py-0.5 text-[12px] tabular-nums"
      style={{ borderColor: "var(--brand-ink)", background: "var(--surface-raised)", color: "var(--text-primary)" }}
    />
  );
}
