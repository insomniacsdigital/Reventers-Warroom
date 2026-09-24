"use client";

import { useState, useTransition } from "react";
import { EditableNumber } from "@/components/EditableNumber";
import { addFestiveRow, removeFestiveRow, setFestiveValue, setNonIpValue } from "@/lib/actions";
import { inputStyle, primaryButtonStyle } from "@/components/ui";
import type { FestiveFormat } from "@/generated/prisma/enums";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function FestiveNumber({
  monthKey,
  brandId,
  festivalId,
  format,
  field,
  value,
  editable,
}: {
  monthKey: string;
  brandId: string;
  festivalId: string;
  format: FestiveFormat;
  field: "target" | "achieved" | "live";
  value: number;
  editable: boolean;
}) {
  return (
    <EditableNumber
      value={value}
      readOnly={!editable}
      label={`${format.toLowerCase()} ${field}`}
      onCommit={(v) => setFestiveValue(monthKey, brandId, festivalId, format, field, v ?? 0)}
    />
  );
}

export function NonIpNumber({
  monthKey,
  brandId,
  field,
  value,
  editable,
}: {
  monthKey: string;
  brandId: string;
  field: "target" | "achieved" | "live";
  value: number;
  editable: boolean;
}) {
  return (
    <EditableNumber value={value} readOnly={!editable} label={`non-IP ${field}`} onCommit={(v) => setNonIpValue(monthKey, brandId, field, v ?? 0)} />
  );
}

export function RemoveFestiveButton({ monthKey, brandId, festivalId }: { monthKey: string; brandId: string; festivalId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      title="Remove this festival for this brand"
      aria-label="Remove"
      onClick={() => {
        if (!confirm("Remove this festival and its numbers for this brand?")) return;
        startTransition(async () => {
          const r = await removeFestiveRow(monthKey, brandId, festivalId);
          if (!r.ok) alert(r.error);
        });
      }}
      className="text-[13px]"
      style={{ color: "var(--status-critical)", opacity: pending ? 0.5 : 1 }}
    >
      ✕
    </button>
  );
}

/** Pick a brand and a festival from the dropdown to add a row with Static / Story / Reel. */
export function AddFestiveForm({
  monthKey,
  brands,
  festivals,
  defaultMonth,
}: {
  monthKey: string;
  brands: { id: string; label: string }[];
  festivals: { id: string; name: string; dateLabel: string; month: number }[];
  defaultMonth: number;
}) {
  const [brandId, setBrandId] = useState(brands[0]?.id ?? "");
  const [festivalId, setFestivalId] = useState("");
  const [pending, startTransition] = useTransition();

  // This month's festivals first, then the rest of the calendar.
  const order = Array.from({ length: 12 }, (_, i) => ((defaultMonth - 1 + i) % 12) + 1);

  return (
    <form
      className="flex flex-wrap gap-2 items-center px-5 py-3.5 border-b"
      style={{ borderColor: "var(--border)" }}
      onSubmit={(e) => {
        e.preventDefault();
        if (!brandId || !festivalId) {
          alert("Pick a brand and a festival.");
          return;
        }
        startTransition(async () => {
          const r = await addFestiveRow(monthKey, brandId, festivalId);
          if (!r.ok) alert(r.error);
          else setFestivalId("");
        });
      }}
    >
      <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className="h-9 rounded-lg border px-2 text-[11px]" style={inputStyle} aria-label="Brand">
        {brands.map((b) => (
          <option key={b.id} value={b.id}>
            {b.label}
          </option>
        ))}
      </select>
      <select
        value={festivalId}
        onChange={(e) => setFestivalId(e.target.value)}
        className="h-9 rounded-lg border px-2 text-[11px] min-w-[260px]"
        style={inputStyle}
        aria-label="Festival"
      >
        <option value="">Choose a festival…</option>
        {order.map((m) => {
          const list = festivals.filter((f) => f.month === m);
          if (!list.length) return null;
          return (
            <optgroup key={m} label={MONTHS[m - 1]}>
              {list.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.dateLabel} — {f.name}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
      <button type="submit" disabled={pending} className="h-9 rounded-lg px-3.5 text-[11px] font-semibold" style={{ ...primaryButtonStyle, opacity: pending ? 0.6 : 1 }}>
        + Add festive
      </button>
    </form>
  );
}
