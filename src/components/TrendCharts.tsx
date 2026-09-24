"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { CATEGORICAL, chartChrome } from "@/lib/chartPalette";
import { monthKeyLabel } from "@/lib/dates";

type RotationTrendPoint = { monthKey: string; outputPct: number; totalTarget: number; totalAchieved: number } & Record<string, number | string>;
type AttendanceTrendPoint = { monthKey: string; absenceRatePct: number; present: number; absent: number };

function EmptyTrend({ label }: { label: string }) {
  return (
    <div className="h-[220px] flex items-center justify-center text-[11px] text-center px-8" style={{ color: "var(--text-muted)" }}>
      {label}
    </div>
  );
}

export function OutputTrendChart({ data }: { data: RotationTrendPoint[] }) {
  const chrome = chartChrome;
  if (data.length < 2) return <EmptyTrend label="Trend appears once the Brand × IP Matrix has at least two months of numbers. Right now there's only one month on record." />;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={chrome.grid} vertical={false} />
        <XAxis
          dataKey="monthKey"
          tickFormatter={(v) => monthKeyLabel(v).replace(/\s\d{4}$/, "")}
          tick={{ fill: chrome.muted, fontSize: 10 }}
          axisLine={{ stroke: chrome.baseline }}
          tickLine={false}
        />
        <YAxis domain={[0, 100]} tick={{ fill: chrome.muted, fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
        <Tooltip
          contentStyle={{ background: chrome.surface, border: `1px solid ${chrome.grid}`, borderRadius: 8, fontSize: 11 }}
          labelFormatter={(v) => monthKeyLabel(String(v))}
          formatter={(value) => [`${value}%`, "Output vs. target"]}
        />
        <Line type="monotone" dataKey="outputPct" stroke={chrome.pink} strokeWidth={2} dot={{ r: 3 }} name="Output vs. target" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function CohortCompletionTrendChart({ data, cohortCodes }: { data: RotationTrendPoint[]; cohortCodes: string[] }) {
  const chrome = chartChrome;
  const palette = CATEGORICAL;
  if (data.length < 2) return <EmptyTrend label="Per-cohort trend appears once the matrix has at least two months of numbers." />;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={chrome.grid} vertical={false} />
        <XAxis
          dataKey="monthKey"
          tickFormatter={(v) => monthKeyLabel(v).replace(/\s\d{4}$/, "")}
          tick={{ fill: chrome.muted, fontSize: 10 }}
          axisLine={{ stroke: chrome.baseline }}
          tickLine={false}
        />
        <YAxis domain={[0, 100]} tick={{ fill: chrome.muted, fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
        <Tooltip
          contentStyle={{ background: chrome.surface, border: `1px solid ${chrome.grid}`, borderRadius: 8, fontSize: 11 }}
          labelFormatter={(v) => monthKeyLabel(String(v))}
        />
        <Legend wrapperStyle={{ fontSize: 10.5, color: chrome.textSecondary }} />
        {cohortCodes.map((code, i) => (
          <Line
            key={code}
            type="monotone"
            dataKey={code}
            stroke={palette[i % palette.length]}
            strokeWidth={2}
            dot={{ r: 2.5 }}
            name={code}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function AttendanceTrendChart({ data }: { data: AttendanceTrendPoint[] }) {
  const chrome = chartChrome;
  if (data.length < 2) return <EmptyTrend label="Attendance trend appears once people have clocked in across at least two months." />;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={chrome.grid} vertical={false} />
        <XAxis
          dataKey="monthKey"
          tickFormatter={(v) => monthKeyLabel(v).replace(/\s\d{4}$/, "")}
          tick={{ fill: chrome.muted, fontSize: 10 }}
          axisLine={{ stroke: chrome.baseline }}
          tickLine={false}
        />
        <YAxis domain={[0, 100]} tick={{ fill: chrome.muted, fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
        <Tooltip
          contentStyle={{ background: chrome.surface, border: `1px solid ${chrome.grid}`, borderRadius: 8, fontSize: 11 }}
          labelFormatter={(v) => monthKeyLabel(String(v))}
          formatter={(value) => [`${value}%`, "Absence rate"]}
        />
        <Line type="monotone" dataKey="absenceRatePct" stroke={chrome.blue} strokeWidth={2} dot={{ r: 3 }} name="Absence rate" />
      </LineChart>
    </ResponsiveContainer>
  );
}
