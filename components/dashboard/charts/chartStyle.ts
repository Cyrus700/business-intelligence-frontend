// Shared styling tokens for recharts so every chart matches the design system.
export const AXIS = {
  tick: { fill: "#94a3b8", fontSize: 12 },
  axisLine: false as const,
  tickLine: false as const,
};

export const GRID_STROKE = "#e2e8f0";

export const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  boxShadow: "0 8px 24px -12px rgba(15,23,42,0.18)",
  fontSize: 12,
  padding: "8px 12px",
} as const;

export const COLORS = {
  primary: "#4f46e5",
  accent: "#10b981",
  violet: "#8b5cf6",
  warn: "#f59e0b",
  muted: "#cbd5e1",
};
