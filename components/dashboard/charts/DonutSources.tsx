"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { nprCompact } from "@/lib/api";
import { TOOLTIP_STYLE } from "./chartStyle";

const PALETTE = ["#4f46e5", "#10b981", "#8b5cf6", "#f59e0b", "#06b6d4"];

export type DonutDatum = { name: string; value: number; share: number };

export default function DonutSources({
  data,
  centerLabel,
  centerSub,
  onSliceClick,
  activeSlice,
}: {
  data: DonutDatum[];
  centerLabel: string;
  centerSub: string;
  onSliceClick?: (name: string) => void;
  activeSlice?: string;
}) {
  const slices = activeSlice
    ? data.map((s) => ({ ...s, fill: s.name === activeSlice ? PALETTE[0] : "#e2e8f0" }))
    : data.map((s, i) => ({ ...s, fill: PALETTE[i % PALETTE.length] }));
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div
        role="img"
        aria-label={`Revenue share by source. ${centerLabel} ${centerSub}`}
        className="relative h-[180px] w-[180px] shrink-0"
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => nprCompact(Number(v))} />
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius={58}
              outerRadius={82}
              paddingAngle={3}
              stroke="none"
              onClick={
                onSliceClick ? (_, index) => onSliceClick(slices[index].name) : undefined
              }
              className={onSliceClick ? "cursor-pointer" : undefined}
            >
              {slices.map((s) => (
                <Cell key={s.name} fill={s.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-xl font-semibold text-ink">{centerLabel}</span>
          <span className="text-xs text-ink-muted">{centerSub}</span>
        </div>
      </div>

      <ul className="flex-1 space-y-2.5">
        {slices.map((s) => (
          <li key={s.name} className="flex items-center gap-2.5 text-sm">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: s.fill }}
            />
            <span className="text-ink-soft">{s.name}</span>
            <span className="ml-auto font-medium text-ink">{s.share}%</span>
            {onSliceClick && (
              <button
                onClick={() => onSliceClick(s.name)}
                aria-pressed={activeSlice === s.name}
                className="text-xs font-medium text-primary hover:underline"
              >
                {activeSlice === s.name ? "clear" : "focus"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
