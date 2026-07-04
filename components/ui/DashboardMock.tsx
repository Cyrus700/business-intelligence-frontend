import { clsx } from "@/lib/cx";
import Icon from "./Icon";

// Purely presentational fake-product UI. Parents animate the hooks:
//  .mock-bar (height), .mock-line (stroke draw), [data-kpi] (count up).
const bars = [38, 52, 44, 66, 58, 78, 70, 92];

export default function DashboardMock({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "w-full rounded-2xl border border-border bg-white p-5 shadow-card",
        className,
      )}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-accent" />
          <span className="text-sm font-semibold text-ink">Revenue overview</span>
        </div>
        <div className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-border" />
          <span className="h-2 w-2 rounded-full bg-border" />
          <span className="h-2 w-2 rounded-full bg-border" />
        </div>
      </div>

      {/* KPI row */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        {[
          { label: "Revenue", value: 1.2, prefix: "$", suffix: "M", tone: "ink" },
          { label: "Forecast", value: 14, prefix: "+", suffix: "%", tone: "accent" },
          { label: "Anomalies", value: 2, prefix: "", suffix: "", tone: "warn" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl bg-bg-soft p-3">
            <p className="text-[11px] font-medium text-ink-muted">{kpi.label}</p>
            <p
              className={clsx(
                "mt-1 font-mono text-lg font-semibold tabular-nums",
                kpi.tone === "accent" && "text-accent",
                kpi.tone === "warn" && "text-warn",
                kpi.tone === "ink" && "text-ink",
              )}
            >
              {kpi.prefix}
              <span
                data-kpi
                data-kpi-to={kpi.value}
                data-kpi-decimals={kpi.value % 1 !== 0 ? 1 : 0}
              >
                {kpi.value}
              </span>
              {kpi.suffix}
            </p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="mt-4 grid grid-cols-5 gap-4">
        {/* Bar chart */}
        <div className="col-span-3 rounded-xl border border-border p-4">
          <div className="flex h-28 items-end gap-1.5">
            {bars.map((h, i) => (
              <div
                key={i}
                className="mock-bar flex-1 origin-bottom rounded-t bg-primary/80"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>

        {/* Line chart */}
        <div className="col-span-2 rounded-xl border border-border p-4">
          <svg viewBox="0 0 120 80" className="h-28 w-full" fill="none">
            <path
              className="mock-line"
              d="M2 64 L22 52 L42 58 L62 34 L82 40 L102 16 L118 22"
              stroke="var(--color-accent)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="102" cy="16" r="3" fill="var(--color-accent)" />
          </svg>
        </div>
      </div>

      {/* Anomaly alert */}
      <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-warn/30 bg-warn-50 px-3.5 py-2.5">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-warn/15 text-warn">
          <Icon name="alert" className="h-4 w-4" />
        </span>
        <p className="text-xs text-ink-soft">
          <span className="font-semibold text-ink">Anomaly flagged</span> — sales
          spike in Region B, 2 min ago.
        </p>
      </div>
    </div>
  );
}
