export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
      <div>
        <h1 className="text-[24px] font-extrabold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-[12px]" style={{ color: "var(--text-muted)" }}>
            {subtitle}
          </p>
        ) : null}
      </div>
      {right ? <div className="flex items-center gap-2 flex-wrap">{right}</div> : null}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border ${className}`}
      style={{ borderColor: "var(--border)", background: "var(--surface-raised)" }}
    >
      {children}
    </div>
  );
}

export function CardHead({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b" style={{ borderColor: "var(--border)" }}>
      <div>
        <h2 className="text-[14px] font-bold">{title}</h2>
        {subtitle ? (
          <p className="text-[10.5px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            {subtitle}
          </p>
        ) : null}
      </div>
      {right}
    </div>
  );
}

export function KpiTile({ label, value, meta }: { label: string; value: React.ReactNode; meta?: string }) {
  return (
    <Card className="p-4">
      <div className="text-[9.5px] font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
      <div className="text-[24px] font-extrabold mt-1.5 tabular-nums">{value}</div>
      {meta ? (
        <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
          {meta}
        </div>
      ) : null}
    </Card>
  );
}

export function ProgressBar({ pct, color = "var(--series-1)" }: { pct: number; color?: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--gridline)" }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${clamped}%`, background: color }} />
    </div>
  );
}

export function Pill({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "brand" }) {
  return (
    <span
      className="text-[9.5px] font-bold rounded-full px-2 py-0.5"
      style={{
        background: tone === "brand" ? "var(--brand-ink)" : "var(--gridline)",
        color: tone === "brand" ? "#fff" : "var(--text-secondary)",
      }}
    >
      {children}
    </span>
  );
}
