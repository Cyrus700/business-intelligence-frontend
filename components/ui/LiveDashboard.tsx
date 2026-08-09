"use client";

import { clsx } from "@/lib/cx";
import { relativeTime, type LandingLive } from "@/lib/landing-api";
import Skeleton from "./Skeleton";

// The product surface shown in the hero and the preview section. Every figure
// is real: it renders whatever GET /landing/live returns, and falls back to a
// skeleton while that request is in flight.
//
// Only platform-scale numbers are shown here — records unified, data sources,
// pipeline health, model/insight counts. Business figures (revenue, orders,
// margins, anomalies, forecasts) stay in the authenticated dashboard, since
// this panel is public.
//
// Animation hooks the parent drives:
//   [data-panel-row]  staggered entrance
//   [data-dim-bar]    width scale-in

function statusRow(key: string): { label: string; tone: string } {
  const k = key.toLowerCase();
  if (k === "succeeded" || k === "success" || k === "completed")
    return { label: "Succeeded", tone: "bg-accent" };
  if (k === "failed" || k === "error") return { label: "Failed", tone: "bg-danger" };
  if (k === "running" || k === "pending" || k === "queued")
    return { label: "Running", tone: "bg-sky" };
  return { label: key, tone: "bg-ink-soft" };
}

export default function LiveDashboard({
  live,
  className,
}: {
  live: LandingLive | null;
  className?: string;
}) {
  const t = live?.totals;
  const p = live?.pipeline;
  const statuses = Object.entries(p?.by_status ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const statusTotal = statuses.reduce((sum, [, n]) => sum + n, 0) || 1;

  const tiles = [
    {
      label: "Records unified",
      value: t ? t.records_unified.toLocaleString("en-IN") : null,
      caption: t ? "sales, finance & inventory" : null,
    },
    {
      label: "Data sources",
      value: t ? `${t.data_sources}` : null,
      caption: t ? "CSV · Excel · PostgreSQL · REST" : null,
    },
    {
      label: "ETL success",
      value: p ? `${p.success_rate_pct}%` : null,
      caption: p?.last_run_at ? `last run ${relativeTime(p.last_run_at)}` : null,
    },
  ];

  const mini = [
    { label: "KPI points computed", value: t?.kpi_points ?? null },
    { label: "Forecast points", value: t?.forecast_points ?? null },
    { label: "ML models trained", value: t?.models_trained ?? null },
    { label: "AI insights written", value: t?.insights ?? null },
  ];

  return (
    <div
      className={clsx(
        "w-full overflow-hidden rounded-2xl border border-border bg-white shadow-card",
        className,
      )}
    >
      {/* Chrome */}
      <div
        data-panel-row
        className="flex items-center justify-between border-b border-border bg-bg-soft/60 px-5 py-3.5"
      >
        <div className="flex items-center gap-2.5">
          <span className="pulse-dot h-2 w-2 rounded-full bg-accent text-accent" />
          <span className="text-sm font-semibold text-ink">Platform overview</span>
          <span className="hidden rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-ink-muted ring-1 ring-border sm:inline">
            {t ? `${t.etl_jobs} ETL runs` : "loading"}
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
          {t ? `${t.records_unified.toLocaleString("en-IN")} rows` : "—"}
        </span>
      </div>

      <div className="p-5">
        {/* Headline tiles — real trailing aggregates */}
        <div data-panel-row className="grid grid-cols-3 gap-3">
          {tiles.map((tile) => (
            <div
              key={tile.label}
              className="rounded-xl border border-border/70 bg-bg-soft/70 p-3"
            >
              <p className="truncate text-[11px] font-medium text-ink-muted">
                {tile.label}
              </p>
              <p className="mt-1 font-mono text-base font-semibold tabular-nums sm:text-lg">
                {tile.value ?? (
                  <Skeleton className="h-5 w-16 sm:w-20" />
                )}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-ink-muted">
                {tile.caption ?? <Skeleton className="h-2.5 w-full" />}
              </p>
            </div>
          ))}
        </div>

        {/* ETL pipeline health — job status breakdown */}
        <div
          data-panel-row
          className="mt-4 rounded-xl border border-border/70 p-3 pb-2"
        >
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[11px] font-medium text-ink-soft">
              ETL pipeline
            </span>
            <span className="flex items-center gap-3 text-[10px] text-ink-muted">
              {statuses.map(([key, n]) => (
                <span key={key} className="flex items-center gap-1.5">
                  <span
                    className={clsx("h-0.5 w-3 rounded-full", statusRow(key).tone)}
                  />
                  {statusRow(key).label} · {n}
                </span>
              ))}
              {!live && <Skeleton className="h-2.5 w-24" />}
            </span>
          </div>

          {statuses.length > 0 ? (
            <div className="grid gap-2">
              {statuses.map(([key, n]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 truncate text-[11px] font-medium text-ink-soft">
                    {statusRow(key).label}
                  </span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-soft">
                    <span
                      data-dim-bar
                      style={{ width: `${(n / statusTotal) * 100}%` }}
                      className="block h-full origin-left rounded-full bg-gradient-to-r from-primary to-violet"
                    />
                  </span>
                  <span className="w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-ink-muted">
                    {Math.round((n / statusTotal) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-3 w-full" />
              ))}
            </div>
          )}
        </div>

        {/* Engine output — what the platform has produced */}
        <div data-panel-row className="mt-4 grid grid-cols-2 gap-3">
          {mini.map((m) => (
            <div
              key={m.label}
              className="flex items-center justify-between rounded-xl border border-border/70 bg-bg-soft/70 px-3 py-2.5"
            >
              <span className="text-[11px] font-medium text-ink-soft">
                {m.label}
              </span>
              <span className="font-mono text-xs font-semibold tabular-nums text-ink">
                {m.value != null ? (
                  m.value.toLocaleString("en-IN")
                ) : (
                  <Skeleton className="h-3.5 w-10" />
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}