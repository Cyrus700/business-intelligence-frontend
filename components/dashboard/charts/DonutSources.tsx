"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { SOURCE_SERIES } from "@/lib/dashboard-data";
import { TOOLTIP_STYLE } from "./chartStyle";

export default function DonutSources() {
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative h-[180px] w-[180px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => `${v}%`} />
            <Pie
              data={SOURCE_SERIES}
              dataKey="value"
              nameKey="name"
              innerRadius={58}
              outerRadius={82}
              paddingAngle={3}
              stroke="none"
            >
              {SOURCE_SERIES.map((s) => (
                <Cell key={s.name} fill={s.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl font-semibold text-ink">8.4k</span>
          <span className="text-xs text-ink-muted">visitors</span>
        </div>
      </div>

      <ul className="flex-1 space-y-2.5">
        {SOURCE_SERIES.map((s) => (
          <li key={s.name} className="flex items-center gap-2.5 text-sm">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            <span className="text-ink-soft">{s.name}</span>
            <span className="ml-auto font-medium text-ink">{s.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
