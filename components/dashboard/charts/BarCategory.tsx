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
import { CATEGORY_SERIES } from "@/lib/dashboard-data";
import { AXIS, COLORS, GRID_STROKE, TOOLTIP_STYLE } from "./chartStyle";

const PALETTE = [COLORS.primary, COLORS.accent, COLORS.violet, COLORS.warn, "#06b6d4"];

export default function BarCategory() {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={CATEGORY_SERIES} margin={{ top: 10, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="4 4" />
        <XAxis dataKey="category" {...AXIS} />
        <YAxis {...AXIS} width={40} />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(79,70,229,0.06)" }} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
          {CATEGORY_SERIES.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
