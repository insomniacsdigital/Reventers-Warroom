"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from "recharts";
import { chartChrome } from "@/lib/chartPalette";

/** Hours worked per day, with the 8-hour line. Short days are shown lighter. */
export function HoursChart({ data }: { data: { day: number; hours: number; label: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={chartChrome.grid} vertical={false} />
        <XAxis dataKey="day" tick={{ fill: chartChrome.muted, fontSize: 10 }} axisLine={{ stroke: chartChrome.baseline }} tickLine={false} interval={1} />
        <YAxis tick={{ fill: chartChrome.muted, fontSize: 10 }} axisLine={false} tickLine={false} width={28} domain={[0, 12]} ticks={[0, 4, 8, 12]} />
        <ReferenceLine y={8} stroke={chartChrome.textSecondary} strokeDasharray="0" strokeWidth={1} label={{ value: "8h", position: "insideTopRight", fill: chartChrome.muted, fontSize: 10 }} />
        <Tooltip
          cursor={{ fill: "rgba(232,18,124,0.06)" }}
          contentStyle={{ background: chartChrome.surface, border: `1px solid ${chartChrome.grid}`, borderRadius: 8, fontSize: 11 }}
          formatter={(value, _name, item) => [`${value}h`, (item?.payload as { label?: string })?.label ?? "Hours"]}
          labelFormatter={(v) => `Day ${v}`}
        />
        <Bar dataKey="hours" radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.day} fill={d.hours >= 8 ? chartChrome.pink : "#f7a6cd"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
