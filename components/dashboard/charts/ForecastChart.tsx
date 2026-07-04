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

export type ForecastPoint = {
  day: string;
  actual: number | null;
  forecast: number | null;
  lo: number | null;
  hi: number | null;
};

// Confidence band drawn by filling up to `hi` with light indigo, then masking
// the area below `lo` with white — leaving a band between lo and hi.
export default function ForecastChart({ data }: { data: ForecastPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="4 4" />
        <XAxis dataKey="day" {...AXIS} minTickGap={28} />
        <YAxis {...AXIS} width={72} tickFormatter={(v) => nprCompact(Number(v))} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => nprCompact(Number(v))} />
        <Area
          type="monotone"
          dataKey="hi"
          name="Upper bound"
          stroke="none"
          fill={COLORS.primary}
          fillOpacity={0.12}
          connectNulls
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="lo"
          name="Lower bound"
          stroke="none"
          fill="#ffffff"
          fillOpacity={1}
          connectNulls
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="actual"
          name="Actual"
          stroke={COLORS.primary}
          strokeWidth={2.5}
          dot={false}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="forecast"
          name="Forecast"
          stroke={COLORS.accent}
          strokeWidth={2.5}
          strokeDasharray="5 4"
          dot={false}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
