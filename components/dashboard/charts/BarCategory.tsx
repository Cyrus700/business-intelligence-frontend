"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { nprCompact } from "@/lib/api";
import { AXIS, COLORS, GRID_STROKE, TOOLTIP_STYLE } from "./chartStyle";

const PALETTE = [COLORS.primary, COLORS.accent, COLORS.violet, COLORS.warn, "#06b6d4", "#ec4899"];

export type BarDatum = { category: string; value: number };

export default function BarCategory({
  data,
  onBarClick,
  activeCategory,
}: {
  data: BarDatum[];
  onBarClick?: (category: string) => void;
  activeCategory?: string;
}) {
  return (
    <div>
      <div
        role="img"
        aria-label={`Revenue by category: ${data.map((d) => `${d.category} ${nprCompact(d.value)}`).join(", ")}`}
      >
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="4 4" />
            <XAxis dataKey="category" {...AXIS} />
            <YAxis {...AXIS} width={64} tickFormatter={(v) => nprCompact(Number(v))} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v) => nprCompact(Number(v))}
              cursor={{ fill: "rgba(79,70,229,0.06)" }}
            />
            <Bar
              dataKey="value"
              name="Revenue"
              radius={[6, 6, 0, 0]}
              maxBarSize={48}
              onClick={onBarClick ? (entry) => onBarClick(String((entry as { payload?: BarDatum }).payload?.category ?? "")) : undefined}
              className={onBarClick ? "cursor-pointer" : undefined}
            >
              {data.map((d, i) => (
                <Cell
                  key={d.category}
                  fill={activeCategory && d.category !== activeCategory ? COLORS.primary + "33" : PALETTE[i % PALETTE.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {onBarClick && (
        <div className="sr-only">
          {data.map((d) => (
            <button
              key={d.category}
              type="button"
              onClick={() => onBarClick(d.category)}
            >
              {activeCategory === d.category ? "Clear filter" : `Filter by ${d.category}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
