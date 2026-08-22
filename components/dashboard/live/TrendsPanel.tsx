"use client";

// Statistical trend per KPI — direction, weekly rate of change, and how
// reliable that direction is (Pearson r on the day-over-day series), computed
// server-side over a rolling window. Surfaces app/api/v1/ml.py's /trends
// endpoint, which previously had no UI consumer anywhere in the dashboard.

import { nprCompact, useApi } from "@/lib/api";
import type { TrendRow } from "@/lib/api";
import Icon from "@/components/ui/Icon";
import { PanelSkeleton } from "./Status";

const METRICS: { key: "revenue" | "orders" | "expenses"; label: string; money: boolean }[] = [
  { key: "revenue", label: "Revenue", money: true },
  { key: "orders", label: "Orders", money: false },
  { key: "expenses", label: "Expenses", money: true },
];

function DirectionBadge({ direction }: { direction: string }) {
  const styles: Record<string, string> = {
    up: "bg-green-50 text-green-700",
    down: "bg-red-50 text-red-700",
    flat: "bg-bg-soft text-ink-soft",
  };
  const arrows: Record<string, string> = { up: "↑", down: "↓", flat: "→" };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        styles[direction] ?? styles.flat
      }`}
    >
      {arrows[direction] ?? "→"} {direction}
    </span>
  );
}

/** How much to trust the direction: |r| close to 1 is a clean trend, near 0 is noise. */
function strengthLabel(r: number): string {
  const abs = Math.abs(r);
  if (abs >= 0.7) return "strong";
  if (abs >= 0.4) return "moderate";
  return "weak";
}

function TrendCard({ metric, label, money }: { metric: string; label: string; money: boolean }) {
  const { data, error, loading } = useApi<TrendRow>("/trends", { metric, window_days: 90 });

  if (loading) return <PanelSkeleton className="h-28" />;

  if (error || !data) {
    return (
      <div className="rounded-xl border border-border p-4">
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="mt-2 text-xs text-ink-muted">
          Not enough history yet — a trend needs at least 14 days of data in this window.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink">{label}</p>
        <DirectionBadge direction={data.direction} />
      </div>
      <p className="mt-2 text-xl font-semibold text-ink">
        {money ? nprCompact(data.current_level) : data.current_level.toLocaleString()}
      </p>
      <p className="mt-1 text-xs text-ink-muted">
        {data.weekly_change_pct >= 0 ? "+" : ""}
        {data.weekly_change_pct}%/week · {strengthLabel(data.strength_r)} trend (r=
        {data.strength_r.toFixed(2)}) · {data.window_days}d window
      </p>
    </div>
  );
}

export default function TrendsPanel() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {METRICS.map((m) => (
        <TrendCard key={m.key} metric={m.key} label={m.label} money={m.money} />
      ))}
    </div>
  );
}
