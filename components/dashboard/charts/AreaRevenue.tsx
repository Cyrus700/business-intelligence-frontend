"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { nprCompact } from "@/lib/api";
import { AXIS, COLORS, GRID_STROKE, TOOLTIP_STYLE } from "./chartStyle";

export type RevenuePoint = { period: string; revenue: number; expenses: number | null };

export default function AreaRevenue({ data }: { data: RevenuePoint[] }) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary" />
          Revenue
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full" style={{ background: COLORS.muted }} />
          Expenses
        </span>
        <span className="ml-auto hidden text-ink-muted sm:inline">
          Selected period
        </span>
      </div>
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: -8 }}>
        <defs>
          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.25} />
            <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="4 4" />
        <XAxis dataKey="period" {...AXIS} minTickGap={24} />
        <YAxis {...AXIS} tickFormatter={(v) => nprCompact(Number(v))} width={72} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v) => nprCompact(Number(v))}
          cursor={{ stroke: COLORS.primary, strokeOpacity: 0.2 }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          name="Revenue"
          stroke={COLORS.primary}
          strokeWidth={2.5}
          fill="url(#rev)"
        />
        <Line
          type="monotone"
          dataKey="expenses"
          name="Expenses"
          stroke={COLORS.muted}
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={false}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
    </div>
  );
}
