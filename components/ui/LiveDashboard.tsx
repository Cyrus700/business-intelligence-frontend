"use client";

import { useMemo } from "react";
import { clsx } from "@/lib/cx";
import { nprCompact } from "@/lib/api";
import {
  monthLabel,
  settledMonths,
  type LandingLive,
} from "@/lib/landing-api";
import {
  areaPath,
  bandPath,
  DEFAULT_BOX,
  makeScale,
  smoothPath,
  type Pt,
} from "@/lib/chart-path";
import Icon from "./Icon";

// The product surface shown in the hero and the preview section. Every figure
// is real: it renders whatever GET /landing/live returns, and falls back to a
// skeleton while that request is in flight.
//
// Animation hooks the parent drives:
//   [data-kpi]        count-up (data-kpi-to / data-kpi-format)
//   .chart-line       stroke-draw
//   .chart-area       fade/scale up from the baseline
//   .chart-band       forecast band reveal
//   [data-dim-bar]    width scale-in
//   [data-panel-row]  staggered entrance

function pct(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
}

function toneFor(v: number | null | undefined, invert = false): string {
  if (v === null || v === undefined) return "text-ink-muted";
  const good = invert ? v < 0 : v > 0;
  return good ? "text-accent" : "text-danger";
}

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function LiveDashboard({
  live,
  className,
}: {
  live: LandingLive | null;
  className?: string;
}) {
  const chart = useMemo(() => {
    const history = settledMonths(live?.revenue_series);
    const forecast = live?.forecast_series ?? [];
    if (history.length === 0) return null;

    // One shared scale so the forecast reads as a continuation of history,
    // not a separate chart pinned to its own maximum.
    const scale = makeScale(
      [
        ...history.map((m) => m.revenue),
        ...forecast.map((f) => f.upper),
      ],
      DEFAULT_BOX,
    );
    const total = history.length + forecast.length;

    const actual: Pt[] = history.map((m, i) => ({
      x: scale.x(i, total),
      y: scale.y(m.revenue),
    }));

    // The forecast line starts at the last actual point so the join is seamless.
    const projected: Pt[] = forecast.length
      ? [
          actual[actual.length - 1],
          ...forecast.map((f, i) => ({
            x: scale.x(history.length + i, total),
            y: scale.y(f.yhat),
          })),
        ]
      : [];

    const upper: Pt[] = forecast.length
      ? [
          actual[actual.length - 1],
          ...forecast.map((f, i) => ({
            x: scale.x(history.length + i, total),
            y: scale.y(f.upper),
          })),
        ]
      : [];
    const lower: Pt[] = forecast.length
      ? [
          actual[actual.length - 1],
          ...forecast.map((f, i) => ({
            x: scale.x(history.length + i, total),
            y: scale.y(Math.max(f.lower, scale.min)),
          })),
        ]
      : [];

    return {
      history,
      forecast,
      line: smoothPath(actual),
      area: areaPath(actual, scale.baseline),
      projectedLine: smoothPath(projected),
      band: bandPath(upper, lower),
      last: actual[actual.length - 1],
      splitX: actual[actual.length - 1]?.x ?? 0,
      baseline: scale.baseline,
    };
  }, [live]);

  const k = live?.kpis;
  const anomaly = live?.anomaly;
  const regions = live?.regions ?? [];

  const tiles = [
    {
      label: "Revenue · 30d",
      value: k ? nprCompact(k.revenue) : null,
      raw: k?.revenue ?? 0,
      change: k?.revenue_change_pct ?? null,
      tone: "ink" as const,
    },
    {
      label: "Orders · 30d",
      value: k ? k.orders.toLocaleString("en-IN") : null,
      raw: k?.orders ?? 0,
      change: k?.orders_change_pct ?? null,
      tone: "ink" as const,
    },
    {
      label: "Net margin",
      value: k?.net_margin_pct != null ? `${k.net_margin_pct}%` : null,
      raw: k?.net_margin_pct ?? 0,
      change: k?.net_change_pct ?? null,
      tone: "accent" as const,
    },
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
          <span className="text-sm font-semibold text-ink">Revenue overview</span>
          <span className="hidden rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-ink-muted ring-1 ring-border sm:inline">
            {live?.coverage.from && live?.coverage.to
              ? `${live.coverage.from} → ${live.coverage.to}`
              : "loading"}
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
          {live ? `${live.totals.records_unified.toLocaleString("en-IN")} rows` : "—"}
        </span>
      </div>

      <div className="p-5">
        {/* KPI tiles — real trailing-30-day figures */}
        <div data-panel-row className="grid grid-cols-3 gap-3">
          {tiles.map((t) => (
            <div
              key={t.label}
              className="rounded-xl border border-border/70 bg-bg-soft/70 p-3"
            >
              <p className="truncate text-[11px] font-medium text-ink-muted">
                {t.label}
              </p>
              <p
                className={clsx(
                  "mt-1 font-mono text-base font-semibold tabular-nums sm:text-lg",
                  t.tone === "accent" ? "text-accent" : "text-ink",
                )}
              >
                {t.value ?? <span className="text-ink-muted">—</span>}
              </p>
              <p className={clsx("mt-0.5 text-[11px] font-medium", toneFor(t.change))}>
                {pct(t.change)}
                <span className="ml-1 font-normal text-ink-muted">vs prev</span>
              </p>
            </div>
          ))}
        </div>

        {/* Revenue history + ARIMA forecast, one shared scale */}
        <div
          data-panel-row
          className="mt-4 rounded-xl border border-border/70 p-3 pb-2"
        >
          <div className="mb-1 flex items-center justify-between px-1">
            <span className="text-[11px] font-medium text-ink-soft">
              Monthly revenue
            </span>
            <span className="flex items-center gap-3 text-[10px] text-ink-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-3 rounded-full bg-primary" />
                actual
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-3 rounded-full border-t border-dashed border-violet" />
                forecast
              </span>
            </span>
          </div>

          {chart ? (
            <svg
              viewBox={`0 0 ${DEFAULT_BOX.width} ${DEFAULT_BOX.height}`}
              className="h-32 w-full sm:h-36"
              preserveAspectRatio="none"
              role="img"
              aria-label="Monthly revenue history with forecast"
            >
              <defs>
                <linearGradient id="ld-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Forecast band (P10–P90 from the model) */}
              {chart.band && (
                <path
                  className="chart-band"
                  d={chart.band}
                  fill="var(--color-violet)"
                  opacity="0.13"
                />
              )}

              {/* Actual revenue */}
              <path className="chart-area" d={chart.area} fill="url(#ld-area)" />
              <path
                className="chart-line"
                d={chart.line}
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />

              {/* Forecast continuation */}
              {chart.projectedLine && (
                <path
                  className="chart-forecast"
                  d={chart.projectedLine}
                  fill="none"
                  stroke="var(--color-violet)"
                  strokeWidth="2.5"
                  strokeDasharray="6 6"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              )}

              {/* "Today" divider between history and projection */}
              {chart.forecast.length > 0 && (
                <line
                  x1={chart.splitX}
                  x2={chart.splitX}
                  y1={DEFAULT_BOX.padTop}
                  y2={chart.baseline}
                  stroke="var(--color-border)"
                  strokeWidth="1"
                  strokeDasharray="3 4"
                  vectorEffect="non-scaling-stroke"
                />
              )}

              <circle
                cx={chart.last.x}
                cy={chart.last.y}
                r="4"
                fill="var(--color-primary)"
                stroke="#fff"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          ) : (
            <div className="h-32 w-full animate-pulse rounded-lg bg-bg-soft sm:h-36" />
          )}

          {/* Month axis — real labels, thinned on small screens */}
          <div className="mt-1 flex justify-between px-1 font-mono text-[9px] text-ink-muted">
            {chart
              ? [...chart.history, ...chart.forecast].map((m, i, arr) => (
                  <span
                    key={`${m.month}-${i}`}
                    className={clsx(i % 2 !== 0 && arr.length > 8 && "hidden sm:inline")}
                  >
                    {monthLabel(m.month)}
                  </span>
                ))
              : null}
          </div>
        </div>

        {/* Revenue share by region — real 90-day split */}
        {regions.length > 0 && (
          <div data-panel-row className="mt-4 grid gap-2">
            {regions.slice(0, 3).map((r) => (
              <div key={r.key} className="flex items-center gap-3">
                <span className="w-16 shrink-0 truncate text-[11px] font-medium text-ink-soft">
                  {r.key}
                </span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-soft">
                  <span
                    data-dim-bar
                    style={{ width: `${r.share_pct}%` }}
                    className="block h-full origin-left rounded-full bg-gradient-to-r from-primary to-violet"
                  />
                </span>
                <span className="w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-ink-muted">
                  {r.share_pct}%
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Most recent anomaly the detector actually raised */}
        {anomaly && (
          <div
            data-panel-row
            className="mt-4 flex items-center gap-2.5 rounded-xl border border-warn/30 bg-warn-50 px-3.5 py-2.5"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-warn/15 text-warn">
              <Icon name="alert" className="h-4 w-4" />
            </span>
            <p className="text-xs leading-snug text-ink-soft">
              <span className="font-semibold text-ink">
                {anomaly.severity === "high" ? "High-severity" : "Anomaly"} ·{" "}
                {anomaly.metric.replace(/_/g, " ")}
              </span>{" "}
              — {nprCompact(anomaly.observed_value)} against an expected{" "}
              {anomaly.expected_value != null
                ? nprCompact(anomaly.expected_value)
                : "baseline"}
              {anomaly.detected_at && ` · ${relativeTime(anomaly.detected_at)}`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
