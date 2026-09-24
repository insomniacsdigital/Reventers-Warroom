/** Absence rate with a colour that gets stronger as it rises. */
export function AbsenceBadge({ rate }: { rate: number }) {
  const tone = rate >= 25 ? "var(--status-critical)" : rate >= 10 ? "#b7791f" : "var(--status-good)";
  const bg = rate >= 25 ? "var(--status-critical-bg)" : rate >= 10 ? "var(--status-warning-bg)" : "var(--status-good-bg)";
  return (
    <span className="rounded-md px-2 py-0.5 text-[10.5px] font-bold tabular-nums" style={{ color: tone, background: bg }}>
      {rate}%
    </span>
  );
}
