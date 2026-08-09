import { clsx } from "@/lib/cx";
import Sparkline from "./charts/Sparkline";

const TONE_COLOR: Record<string, string> = {
  primary: "#4f46e5",
  accent: "#10b981",
  warn: "#f59e0b",
  ink: "#0f172a",
};

export default function KpiCard({
  label,
  value,
  delta,
  spark,
  tone,
}: {
  label: string;
  value: string;
  delta: number;
  spark: readonly number[];
  tone: string;
}) {
  const up = delta >= 0;
  const color = TONE_COLOR[tone] ?? TONE_COLOR.primary;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-0.5"
        style={{ background: color }}
      />
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm text-ink-soft">{label}</p>
        <span
          className={clsx(
            "inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
            up ? "bg-accent-50 text-accent" : "bg-warn-50 text-warn",
          )}
        >
          {up ? "↑" : "↓"} {Math.abs(delta)}%
        </span>
      </div>
      <p className="mt-2 font-mono text-3xl font-semibold tracking-tight text-ink tabular-nums">
        {value}
      </p>
      <div className="mt-3">
        <Sparkline data={spark} color={color} />
      </div>
    </div>
  );
}