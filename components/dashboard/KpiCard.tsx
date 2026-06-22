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
    <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-soft">{label}</p>
        <span
          className={clsx(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
            up ? "bg-accent-50 text-accent" : "bg-warn-50 text-warn",
          )}
        >
          {up ? "↑" : "↓"} {Math.abs(delta)}%
        </span>
      </div>
      <p className="mt-2 font-mono text-3xl font-semibold tracking-tight text-ink">
        {value}
      </p>
      <div className="mt-3">
        <Sparkline data={spark} color={color} />
      </div>
    </div>
  );
}
