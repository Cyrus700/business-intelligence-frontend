"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import { apiGet, apiPost, npr, nprCompact, type CompareResponse, type CompareMeta } from "@/lib/api";
import { BUSINESS_TZ } from "@/lib/filters/utils";
import { useCan } from "@/lib/use-role";

// ── constants & helpers ─────────────────────────────────────────────────

const PALETTE = ["#4f46e5", "#10b981", "#8b5cf6", "#f59e0b", "#06b6d4", "#ec4899", "#6366f1", "#14b8a6"] as const;
const AXIS = { tick: { fill: "#94a3b8", fontSize: 11 }, axisLine: false as const, tickLine: false as const };
const GRID_STROKE = "#e2e8f0";
const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  boxShadow: "0 8px 24px -12px rgba(15,23,42,0.18)",
  fontSize: 12,
  padding: "8px 12px",
} as const;

function formatChange(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) return "—";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}
function changeColor(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) return "text-slate-400 bg-slate-50 border-slate-200";
  if (pct > 3) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (pct < -3) return "text-red-700 bg-red-50 border-red-200";
  return "text-slate-600 bg-slate-50 border-slate-200";
}
function trendArrow(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) return "—";
  if (pct > 0) return "▲";
  if (pct < 0) return "▼";
  return "■";
}
function safeId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

// Month / Year helpers — monthOptions returns last `count` months chronologically, no future
function monthOptions(count = 36): string[] {
  const now = new Date();
  const opts: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    opts.push(ym);
  }
  return opts;
}
function yearOptions(count = 6): number[] {
  const cur = new Date().getFullYear();
  return Array.from({ length: count }, (_, i) => cur - i);
}
function quarterFromMonth(month1to12: number): 1 | 2 | 3 | 4 {
  return (Math.ceil(month1to12 / 3) as 1 | 2 | 3 | 4);
}
function quarterLabel(year: number, q: number): string {
  return `Q${q} ${year}`;
}
function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
function quarterBounds(year: number, quarter: number): { from: string; to: string; label: string } {
  const startMonth = (quarter - 1) * 3; // 0-indexed
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    from: `${year}-${pad(startMonth + 1)}-01`,
    to: `${year}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
    label: quarterLabel(year, quarter),
  };
}

// URL persistence — encode compare state to shareable link
type PersistState = {
  mode: "month" | "year" | "quarter" | "custom";
  months?: string[];
  years?: number[];
  quarters?: string[];
  periods?: { from: string; to: string; label: string }[];
  metrics?: string[];
  dims?: string[];
  tsMetric?: string;
  tsGran?: string;
};
function encodeState(s: PersistState): string {
  try {
    return encodeURIComponent(btoa(JSON.stringify(s)));
  } catch {
    return "";
  }
}
function decodeState(raw: string | null): PersistState | null {
  if (!raw) return null;
  try {
    return JSON.parse(atob(decodeURIComponent(raw)));
  } catch {
    return null;
  }
}

// ── illustrations — fully responsive, accessible, bug-free ──────────────

function KpiCards({ data, normalize }: { data: CompareResponse; normalize: boolean }) {
  const periods = data.periods;
  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {data.kpi_comparison.map((kc) => {
        const pct = kc.total_pct;
        const isOrders = kc.metric === "orders";
        return (
          <div key={kc.metric} className="rounded-2xl border border-border bg-white p-4 sm:p-5 shadow-sm flex flex-col min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-soft truncate">{kc.label}</p>
                <p className="mt-1 text-xs text-ink-muted">Unit: {kc.unit || "—"} · Trend: {kc.trend} {kc.cagr_pct != null ? `· CAGR ${kc.cagr_pct > 0 ? "+" : ""}${kc.cagr_pct}%` : ""}</p>
              </div>
              <span
                className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${changeColor(pct)}`}
                aria-label={`${kc.label} total change ${formatChange(pct)}`}
              >
                {trendArrow(pct)} {formatChange(pct)}
              </span>
            </div>
            <div className="mt-4 space-y-2">
              {periods.map((p, i) => {
                const v = normalize && (kc as unknown as { per_day_values?: number[] }).per_day_values ? (kc as unknown as { per_day_values: number[] }).per_day_values[i] : kc.values[i];
                const pctVsFirst = normalize ? (kc as unknown as { per_day_pct_vs_first?: (number | null)[] }).per_day_pct_vs_first?.[i] : kc.pct_vs_first[i];
                const isFirst = i === 0;
                const displayPct = isFirst ? null : pctVsFirst;
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5 min-w-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-ink truncate">{p.label}</p>
                      <p className="text-[11px] text-ink-muted truncate">{p.from} → {p.to} · {p.span_days}d</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-ink tabular-nums">{isOrders ? v.toLocaleString() : normalize ? `${nprCompact(v)}/d` : nprCompact(v)}</p>
                      {!isFirst && displayPct !== null && displayPct !== undefined && (
                        <p className={`text-xs font-semibold tabular-nums ${displayPct >= 0 ? "text-emerald-600" : "text-red-600"}`}>{displayPct > 0 ? "+" : ""}{displayPct.toFixed(1)}% vs {periods[0].label}</p>
                      )}
                      {isFirst && <p className="text-[11px] text-ink-muted">baseline</p>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-muted">
              <span>Total Δ {kc.total_delta >= 0 ? "+" : ""}{isOrders ? kc.total_delta.toLocaleString() : npr(kc.total_delta)}</span>
              <span>· Min {isOrders ? kc.min.toLocaleString() : nprCompact(kc.min)}</span>
              <span>· Max {isOrders ? kc.max.toLocaleString() : nprCompact(kc.max)}</span>
              {kc.avg !== undefined && <span>· Avg {isOrders ? (kc as unknown as { avg: number }).avg.toLocaleString() : nprCompact((kc as unknown as { avg: number }).avg)}</span>}
              {kc.cv_pct !== null && kc.cv_pct !== undefined && <span>· CV {kc.cv_pct}%</span>}
            </div>
            {normalize && periods.some((p, i) => p.span_days !== periods[0].span_days) && (
              <p className="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">Per-day normalized — lengths differ ({periods.map((p) => `${p.span_days}d`).join(" vs ")}).</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function GroupedKpiBarChart({ data, normalize }: { data: CompareResponse; normalize: boolean }) {
  const periods = data.periods;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {data.kpi_comparison.map((kc) => {
        const rawValues = (normalize && (kc as unknown as { per_day_values?: number[] }).per_day_values) ? (kc as unknown as { per_day_values: number[] }).per_day_values : kc.values;
        const chartData = periods.map((p, i) => ({ period: p.label, value: rawValues[i] }));
        const isCurrency = kc.metric !== "orders";
        const isEmpty = chartData.every((d) => d.value === 0);
        return (
          <div key={kc.metric} className="rounded-2xl border border-border bg-white p-4 sm:p-5 flex flex-col min-w-0">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold text-ink truncate">{kc.label} — per {normalize ? "day" : "period"}{isEmpty ? " (no data)" : ""}</h4>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${changeColor(kc.total_pct)}`}>{formatChange(kc.total_pct)} total</span>
            </div>
            {isEmpty ? (
              <div className="mt-6 flex h-[200px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-ink-soft">No data for this metric in the selected periods</div>
            ) : (
              <div className="mt-3 h-[200px] sm:h-[240px] lg:h-[260px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: -8 }} role="img" aria-label={`${kc.label} comparison across ${periods.length} periods`}>
                    <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="4 4" />
                    <XAxis dataKey="period" {...AXIS} interval={0} angle={periods.length > 3 ? -14 : 0} textAnchor={periods.length > 3 ? "end" : "middle"} height={periods.length > 3 ? 44 : 28} tick={{ ...AXIS.tick, fontSize: periods.length > 4 ? 10 : 11 }} />
                    <YAxis {...AXIS} width={64} tickFormatter={(v) => (isCurrency ? nprCompact(Number(v)) : Number(v).toLocaleString())} />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={((v: unknown) => (isCurrency ? npr(Number(v as number)) + (normalize ? "/day" : "") : Number(v as number).toLocaleString() + (normalize ? "/day" : ""))) as never}
                      cursor={{ fill: "rgba(79,70,229,0.06)" }}
                    />
                    <Bar dataKey="value" name={kc.label} radius={[8, 8, 0, 0]} maxBarSize={56}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-ink-soft">
              {periods.map((p, i) => (
                <span key={p.id} className="inline-flex items-center gap-1.5 min-w-0">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                  <span className="truncate">{p.label}: {isCurrency ? npr(rawValues[i]) + (normalize ? "/d" : "") : rawValues[i].toLocaleString() + (normalize ? "/d" : "")}</span>
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DimensionalPanels({ data, normalize }: { data: CompareResponse; normalize: boolean }) {
  const entries = Object.entries(data.dimensional);
  if (entries.length === 0) return <p className="text-sm text-ink-soft">No dimensional breakdown selected.</p>;
  return (
    <div className="space-y-6">
      {entries.map(([dim, payload]) => {
        const chartData = payload.series.slice(0, 8).map((s) => {
          const row: Record<string, string | number> = { key: s.key.length > 14 ? s.key.slice(0, 14) + "…" : s.key };
          payload.period_labels.forEach((lab, idx) => {
            const pd = (s as unknown as { per_day?: number[] }).per_day;
            const vals = normalize && pd ? pd[idx] : s.values[idx];
            row[lab] = vals ?? 0;
          });
          return row;
        });
        const hasData = payload.series.some((s) => s.total > 0);
        return (
          <div key={dim} className="rounded-2xl border border-border bg-white p-4 sm:p-5 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold capitalize text-ink truncate">{dim.replace("_", " ")} — top movers</h4>
                <p className="text-xs text-ink-soft truncate">Totals per period: {payload.totals.map((t, i) => `${payload.period_labels[i]} ${nprCompact(t)}`).join(" · ")} {normalize ? " (toggle per-day for fair length)" : ""}</p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                {payload.top_gainer && payload.top_gainer.key !== "Other" && (
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 max-w-[180px] truncate">Top gainer: {payload.top_gainer.key} {formatChange(payload.top_gainer.pct_vs_first)}</span>
                )}
                {(payload.all_keys_count ?? 0) > 8 && <span className="rounded-full bg-slate-50 border border-slate-200 px-2 py-1 text-xs text-slate-600">+{(payload.all_keys_count ?? 0) - 8} more</span>}
              </div>
            </div>

            {hasData ? (
              <div className="mt-4 h-[260px] sm:h-[300px] lg:h-[340px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 36, left: -8 }}>
                    <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="4 4" />
                    <XAxis dataKey="key" {...AXIS} interval={0} angle={-18} textAnchor="end" height={48} tick={{ ...AXIS.tick, fontSize: 11 }} />
                    <YAxis {...AXIS} width={64} tickFormatter={(v) => nprCompact(Number(v))} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={((v: unknown) => npr(Number(v as number)) + (normalize ? "/day" : "")) as never} cursor={{ fill: "rgba(79,70,229,0.04)" }} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    {payload.period_labels.map((lab, i) => (
                      <Bar key={lab} dataKey={lab} name={lab} fill={PALETTE[i % PALETTE.length]} radius={[6, 6, 0, 0]} maxBarSize={28} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="mt-4 h-[180px] grid place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-ink-soft">No data for this dimension in selected periods</div>
            )}

            {/* Responsive table: desktop = table, mobile = cards */}
            <div className="mt-4 hidden sm:block overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-widest text-ink-soft">
                    <th className="pb-2 pr-3 whitespace-nowrap">{dim}</th>
                    {payload.period_labels.map((l) => (
                      <th key={l} className="pb-2 pr-3 text-right whitespace-nowrap">{l}{normalize ? "/d" : ""}</th>
                    ))}
                    <th className="pb-2 pr-3 text-right whitespace-nowrap">Δ vs first</th>
                    <th className="pb-2 text-right whitespace-nowrap">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {payload.series.slice(0, 10).map((s) => {
                    const vals = normalize && (s as unknown as { per_day?: number[] }).per_day ? (s as unknown as { per_day: number[] }).per_day : s.values;
                    return (
                      <tr key={s.key} className="border-b border-slate-100 hover:bg-slate-50/60">
                        <td className="py-2 pr-3 font-medium text-ink max-w-[160px] truncate" title={s.key}>{s.key}</td>
                        {(vals as number[]).map((v, i) => (
                          <td key={i} className="py-2 pr-3 text-right font-mono text-ink tabular-nums whitespace-nowrap">{npr(v as number)}</td>
                        ))}
                        <td className={`py-2 pr-3 text-right font-semibold whitespace-nowrap ${s.pct_vs_first === null ? "text-slate-400" : s.pct_vs_first >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatChange(s.pct_vs_first)}</td>
                        <td className="py-2 text-right whitespace-nowrap">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${s.direction === "up" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : s.direction === "down" ? "bg-red-50 border-red-200 text-red-700" : "bg-slate-50 border-slate-200 text-slate-600"}`}>{s.trend}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="mt-4 grid gap-3 sm:hidden">
              {payload.series.slice(0, 6).map((s) => {
                const vals = normalize && (s as unknown as { per_day?: number[] }).per_day ? (s as unknown as { per_day: number[] }).per_day : s.values;
                return (
                  <div key={s.key} className="rounded-xl border border-slate-200 p-3 bg-slate-50/50">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-ink text-sm truncate">{s.key}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${changeColor(s.pct_vs_first)}`}>{formatChange(s.pct_vs_first)}</span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {payload.period_labels.map((lab, i) => (
                        <div key={lab} className="rounded-lg bg-white border border-slate-100 p-2">
                          <p className="text-[11px] text-ink-soft truncate">{lab}</p>
                          <p className="text-sm font-mono font-semibold text-ink tabular-nums">{npr(vals[i] as number)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TimeseriesOverlayChart({ overlay }: { overlay: CompareResponse["timeseries_overlay"] }) {
  if (!overlay || !overlay.series.length) return <p className="text-sm text-ink-soft">No timeseries — the periods may be too short or have no data.</p>;
  const nonEmpty = overlay.series.filter((s) => s.points.length > 0);
  if (nonEmpty.length === 0) return <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-ink-soft">No timeseries points for {overlay.metric} in these periods (check data coverage).</div>;
  const maxLen = Math.max(...overlay.series.map((s) => s.points.length));
  const data: Record<string, number | string>[] = [];
  for (let i = 0; i < maxLen; i++) {
    const row: Record<string, number | string> = { day: i + 1 };
    overlay.series.forEach((s) => {
      const pt = s.points[i];
      if (pt) row[s.period_label] = pt.value;
    });
    data.push(row);
  }
  const xLabel = overlay.granularity === "day" ? "Day of period" : overlay.granularity === "week" ? "Week of period" : overlay.granularity === "month" ? "Month bucket" : "Bucket";
  return (
    <div className="rounded-2xl border border-border bg-white p-4 sm:p-5 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-ink">Timeseries overlay — {overlay.metric} · {overlay.granularity}</h4>
        <span className="text-xs text-ink-soft">{overlay.series.length} periods · {maxLen} points (max) · aligned by position</span>
      </div>
      <div className="mt-4 h-[280px] sm:h-[320px] lg:h-[360px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 16, left: -8 }}>
            <CartesianGrid stroke={GRID_STROKE} strokeDasharray="4 4" />
            <XAxis dataKey="day" {...AXIS} label={{ value: xLabel, position: "insideBottom", offset: -10, fill: "#94a3b8", fontSize: 11 }} />
            <YAxis {...AXIS} width={64} tickFormatter={(v) => nprCompact(Number(v))} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={((v: unknown) => npr(Number(v as number))) as never} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            {overlay.series.map((s, i) => (
              <Line key={s.period_id} type="monotone" dataKey={s.period_label} stroke={PALETTE[i % PALETTE.length]} strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-ink-muted">Aligned by position within the period (1 = first {overlay.granularity}). Gaps = no data for that bucket — not zero.</p>
    </div>
  );
}

function DeltaHeatTable({ data, normalize }: { data: CompareResponse; normalize: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 sm:p-5 min-w-0">
      <h4 className="text-sm font-semibold text-ink">Delta heat — % change vs first period {normalize ? "(per-day normalized)" : ""}</h4>
      <div className="mt-3 overflow-x-auto -mx-5 px-5">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-widest text-ink-soft">
              <th className="pb-2 pr-3 sticky left-0 bg-white">Metric</th>
              {data.periods.map((p) => (
                <th key={p.id} className="pb-2 pr-3 text-right whitespace-nowrap">{p.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.kpi_comparison.map((kc) => {
              const pcts = normalize ? (kc as unknown as { per_day_pct_vs_first?: (number|null)[] }).per_day_pct_vs_first ?? kc.pct_vs_first : kc.pct_vs_first;
              return (
                <tr key={kc.metric} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="py-2 pr-3 font-medium text-ink sticky left-0 bg-white">{kc.label}</td>
                  {pcts.map((pct, i) => (
                    <td key={i} className="py-2 pr-3 text-right">
                      {i === 0 ? (
                        <span className="inline-flex rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-xs text-slate-600">baseline</span>
                      ) : (
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${changeColor(pct)}`}>{formatChange(pct)}</span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Client ───────────────────────────────────────────────────────────

type Mode = "month" | "year" | "quarter" | "custom";

export default function CompareClient() {
  const { data: meta } = useQuery<CompareMeta>({
    queryKey: ["compare", "meta"],
    queryFn: () => apiGet<CompareMeta>("/analytics/compare/meta"),
    staleTime: 60_000,
  });

  const [mode, setMode] = useState<Mode>("month");
  const [selectedMonths, setSelectedMonths] = useState<string[]>(() => {
    const now = new Date();
    const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevStr = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
    return [prevStr, cur];
  });
  const [selectedYears, setSelectedYears] = useState<number[]>(() => {
    const y = new Date().getFullYear();
    return [y - 1, y];
  });
  const [customPeriods, setCustomPeriods] = useState<{ id: string; from: string; to: string; label: string }[]>(() => {
    const today = new Date().toISOString().slice(0, 10);
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const pad = (n: number) => String(n).padStart(2, "0");
    const from = `${lastMonth.getFullYear()}-${pad(lastMonth.getMonth() + 1)}-01`;
    const endD = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
    const to = `${endD.getFullYear()}-${pad(endD.getMonth() + 1)}-${pad(endD.getDate())}`;
    const curFrom = `${new Date().getFullYear()}-${pad(new Date().getMonth() + 1)}-01`;
    return [
      { id: "1", from, to, label: new Date(lastMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" }) },
      { id: "2", from: curFrom, to: today, label: "This month to date" },
    ];
  });
  const [selectedQuarters, setSelectedQuarters] = useState<string[]>(() => {
    const now = new Date();
    const curQ = quarterFromMonth(now.getMonth() + 1);
    const cur = `${now.getFullYear()}-Q${curQ}`;
    const prevQ = curQ === 1 ? `${now.getFullYear() - 1}-Q4` : `${now.getFullYear()}-Q${(curQ - 1)}`;
    return [prevQ, cur];
  });

  const canViewPnl = useCan("pnl:view");
  const [metrics, setMetrics] = useState<string[]>(["revenue", "orders", "avg_order_value"]);
  const [dimensions, setDimensions] = useState<string[]>(["category", "channel", "region"]);
  const [includeTimeseries, setIncludeTimeseries] = useState(true);
  const [timeseriesMetric, setTimeseriesMetric] = useState("revenue");
  const [timeseriesGranularity, setTimeseriesGranularity] = useState("day");
  const [normalize, setNormalize] = useState(false);
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [ai, setAi] = useState<CompareResponse["ai"] | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  const compareMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiPost<CompareResponse>("/analytics/compare", body),
    onSuccess: (data) => {
      setResult(data);
      setAi(data.ai ?? null);
      setAiError(null);
      setFormError(null);
      // persist to URL for share
      try {
        const state: PersistState = {
          mode,
          months: mode === "month" ? selectedMonths : undefined,
          years: mode === "year" ? selectedYears : undefined,
          quarters: mode === "quarter" ? selectedQuarters : undefined,
          periods: mode === "custom" ? customPeriods : undefined,
          metrics,
          dims: dimensions,
          tsMetric: timeseriesMetric,
          tsGran: timeseriesGranularity,
        };
        const encoded = encodeState(state);
        const url = new URL(window.location.href);
        url.searchParams.set("c", encoded);
        window.history.replaceState({}, "", url.toString());
      } catch {}
      // save to local history
      try {
        const key = "sairash.compare.history";
        const raw = localStorage.getItem(key);
        const arr: unknown[] = raw ? JSON.parse(raw) : [];
        const entry = { at: new Date().toISOString(), mode, label: data.periods.map((p) => p.label).join(" vs "), periods: data.periods.length };
        const next = [entry, ...arr].slice(0, 12);
        localStorage.setItem(key, JSON.stringify(next));
      } catch {}
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Compare failed";
      // ApiError carries status
      const detail = (e as { message?: string })?.message ?? msg;
      setFormError(detail.includes("Missing permission") ? "You need compare:view permission — ask an admin." : detail);
    },
  });
  const aiMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiPost<{ ai: NonNullable<CompareResponse["ai"]> }>("/analytics/compare/ai", body),
    onSuccess: (data) => {
      setAi(data.ai);
      setAiError(null);
    },
    onError: (e: unknown) => setAiError(e instanceof Error ? e.message : "AI request failed"),
  });

  const monthsList = useMemo(() => monthOptions(36), []);
  const yearsList = useMemo(() => yearOptions(8), []);
  const quartersList = useMemo(() => {
    const cur = new Date().getFullYear();
    const list: string[] = [];
    for (let y = cur; y >= cur - 3; y--) {
      for (let q = 4; q >= 1; q--) list.push(`${y}-Q${q}`);
    }
    return list;
  }, []);

  const canCompare = useMemo(() => {
    if (mode === "month") return selectedMonths.length >= 2 && selectedMonths.length <= 6;
    if (mode === "year") return selectedYears.length >= 2 && selectedYears.length <= 6;
    if (mode === "quarter") return selectedQuarters.length >= 2 && selectedQuarters.length <= 6;
    return customPeriods.length >= 2 && customPeriods.length <= 6 && customPeriods.every((p) => p.from && p.to);
  }, [mode, selectedMonths, selectedYears, selectedQuarters, customPeriods]);

  // Restore from URL on mount (share link)
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const decoded = decodeState(sp.get("c"));
      if (!decoded) return;
      if (decoded.mode) setMode(decoded.mode as Mode);
      if (decoded.months?.length) setSelectedMonths(decoded.months);
      if (decoded.years?.length) setSelectedYears(decoded.years);
      if (decoded.periods?.length) setCustomPeriods(decoded.periods.map((p) => ({ id: safeId(), ...p })));
      if (decoded.metrics?.length) setMetrics(decoded.metrics);
      if (decoded.dims?.length) setDimensions(decoded.dims);
      if (decoded.tsMetric) setTimeseriesMetric(decoded.tsMetric);
      if (decoded.tsGran) setTimeseriesGranularity(decoded.tsGran);
      if (decoded.mode === "quarter" && decoded.periods?.length) {
        // quarters encoded as periods with Q labels — recover quarters list from labels
        const qs = decoded.periods.map((p) => {
          // try to parse label like "Q2 2024" -> "2024-Q2"
          const m = p.label.match(/Q([1-4])\s+(\d{4})/);
          if (m) return `${m[2]}-Q${m[1]}`;
          return null;
        }).filter(Boolean) as string[];
        if (qs.length >= 2) setSelectedQuarters(qs);
      }
    } catch {}
  }, []);

  const buildBody = useCallback((): Record<string, unknown> => {
    const base: Record<string, unknown> = {
      metrics,
      dimensions,
      include_timeseries: includeTimeseries,
      timeseries_metric: timeseriesMetric,
      timeseries_granularity: timeseriesGranularity,
    };
    if (mode === "month") return { ...base, months: selectedMonths };
    if (mode === "year") return { ...base, years: selectedYears };
    if (mode === "quarter") {
      const periods = selectedQuarters.map((q) => {
        const [y, qq] = q.split("-Q");
        const b = quarterBounds(Number(y), Number(qq));
        return { from: b.from, to: b.to, label: b.label };
      });
      return { ...base, periods };
    }
    return {
      ...base,
      periods: customPeriods.map((p) => ({ from: p.from, to: p.to, label: p.label || `${p.from} → ${p.to}` })),
    };
  }, [mode, selectedMonths, selectedYears, selectedQuarters, customPeriods, metrics, dimensions, includeTimeseries, timeseriesMetric, timeseriesGranularity]);

  const validateBeforeCompare = (): string | null => {
    if (!canCompare) return "Select 2–6 periods to compare.";
    if (metrics.length === 0) return "Pick at least one metric.";
    if (dimensions.length === 0) return "Pick at least one breakdown (or choose none to skip dimensional).";
    if (mode === "custom") {
      for (const p of customPeriods) {
        if (!p.from || !p.to) return `Period "${p.label || p.id}" is missing a date.`;
        if (p.from > p.to) return `Period "${p.label}" has From after To.`;
      }
    }
    return null;
  };

  const handleCompare = () => {
    const err = validateBeforeCompare();
    if (err) {
      setFormError(err);
      return;
    }
    setResult(null);
    setAi(null);
    setAiError(null);
    setFormError(null);
    compareMut.mutate(buildBody());
  };
  const handleAI = () => {
    const err = validateBeforeCompare();
    if (err) {
      setFormError(err);
      return;
    }
    setAiError(null);
    aiMut.mutate({ ...buildBody(), include_timeseries: false });
  };

  const toggleMonth = (ym: string) => {
    setSelectedMonths((prev) => (prev.includes(ym) ? prev.filter((x) => x !== ym) : prev.length < 6 ? [...prev, ym].sort() : prev));
  };
  const toggleYear = (y: number) => {
    setSelectedYears((prev) => (prev.includes(y) ? prev.filter((x) => x !== y) : prev.length < 6 ? [...prev, y].sort((a, b) => a - b) : prev));
  };
  const toggleQuarter = (q: string) => {
    setSelectedQuarters((prev) => (prev.includes(q) ? prev.filter((x) => x !== q) : prev.length < 6 ? [...prev, q].sort() : prev));
  };
  const toggleMetric = (m: string) => {
    setMetrics((prev) => {
      if (prev.includes(m)) {
        if (prev.length === 1) return prev; // keep at least one
        return prev.filter((x) => x !== m);
      }
      return [...prev, m];
    });
  };
  const toggleDim = (d: string) => {
    setDimensions((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const quickPresets: { label: string; action: () => void }[] = [
    { label: "Last 2 months", action: () => { setMode("month"); setSelectedMonths(monthOptions(36).slice(-2)); } },
    { label: "Last 3 months", action: () => { setMode("month"); setSelectedMonths(monthOptions(36).slice(-3)); } },
    { label: "Last 6 months", action: () => { setMode("month"); setSelectedMonths(monthOptions(36).slice(-6)); } },
    { label: "This year", action: () => { setMode("month"); const y = new Date().getFullYear(); setSelectedMonths(monthOptions(36).filter((ym) => ym.startsWith(String(y)))); } },
    { label: "YoY same month", action: () => {
      const now = new Date(); const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`; const prev = `${now.getFullYear() - 1}-${String(now.getMonth() + 1).padStart(2, "0")}`; setMode("month"); setSelectedMonths([prev, cur]);
    } },
    { label: "QoQ", action: () => {
      const now = new Date(); const curQ = quarterFromMonth(now.getMonth() + 1); const curY = now.getFullYear(); let prevQ = curQ - 1; let prevY = curY; if (prevQ < 1) { prevQ = 4; prevY -= 1; } setMode("quarter"); setSelectedQuarters([`${prevY}-Q${prevQ}`, `${curY}-Q${curQ}`]);
    } },
    { label: "YTD vs LYTD", action: () => {
      const now = new Date(); const y = now.getFullYear(); const pad = (n: number) => String(n).padStart(2, "0");
      const from1 = `${y}-01-01`; const to1 = `${y}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
      const from2 = `${y-1}-01-01`; const to2 = `${y-1}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
      setMode("custom");
      setCustomPeriods([{ id: safeId(), from: from2, to: to2, label: `YTD ${y-1}` }, { id: safeId(), from: from1, to: to1, label: `YTD ${y}` }]);
    } },
  ];

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // fallback: select
      window.prompt("Copy this link:", window.location.href);
    }
  };

  const exportCsv = () => {
    if (!result) return;
    const header = ["Metric", ...result.periods.map((p) => `"${p.label.replaceAll('"','""')}"`)];
    const rows = result.kpi_comparison.map((kc) => [`"${kc.label}"`, ...kc.values.map((v) => String(v))].join(","));
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compare-${result.periods.map((p) => p.label.replace(/\s+/g, "_")).join("_vs_")}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportXlsx = async () => {
    if (!result) return;
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      const wsData: (string | number)[][] = [
        ["Metric", ...result.periods.map((p) => p.label), "Δ total", "% total"],
        ...result.kpi_comparison.map((kc) => [kc.label, ...kc.values, kc.total_delta, kc.total_pct ?? "—"]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, "KPIs");
      // dimensional
      for (const [dim, payload] of Object.entries(result.dimensional)) {
        const header = [dim, ...payload.period_labels, "Δ vs first", "%"];
        const rows: (string | number)[][] = [header];
        for (const s of payload.series.slice(0, 12)) {
          rows.push([s.key, ...s.values, s.delta_vs_first, s.pct_vs_first ?? "—"]);
        }
        const ws2 = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws2, dim.slice(0, 31));
      }
      XLSX.writeFile(wb, `compare-${result.periods.map((p) => p.label).join("_vs_")}.xlsx`);
    } catch {
      exportCsv();
    }
  };

  return (
    <>
      <PageHeader
        title="Compare"
        subtitle="Side-by-side month, quarter or year analysis — illustrations, drivers and AI suggestions. Shareable, per-day normalized, org-scoped."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-violet-50 border border-violet-200 px-3 py-1 text-xs font-medium text-violet-700">
              <span className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" aria-hidden /> Live warehouse
            </span>
            <span className="text-xs text-ink-soft hidden md:inline">TZ: {BUSINESS_TZ}</span>
            {result && (
              <button onClick={copyShareLink} className="inline-flex items-center gap-1.5 rounded-full bg-white border border-border px-3 py-1 text-xs font-medium text-ink hover:bg-slate-50" aria-label="Copy share link">
                <Icon name="copy" className="h-3.5 w-3.5" /> {shareCopied ? "Copied!" : "Share"}
              </button>
            )}
          </div>
        }
      />

      {/* Builder — print:hidden */}
      <Panel
        title="Build your comparison"
        subtitle="Pick 2–6 periods. Use presets for speed, or craft any range. Per-day toggle removes month-length bias."
        action={
          <div className="flex flex-wrap gap-2 print:hidden">
            {(["month", "quarter", "year", "custom"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`rounded-full px-4 py-1.5 text-sm font-medium border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${mode === m ? "bg-primary text-white border-primary shadow" : "bg-white text-ink border-border hover:bg-slate-50"}`}
              >
                {m === "month" ? "Months" : m === "quarter" ? "Quarters" : m === "year" ? "Years" : "Custom"}
              </button>
            ))}
          </div>
        }
        className="print:hidden"
      >
        {/* Quick presets */}
        <div className="flex flex-wrap gap-2 mb-4">
          {quickPresets.map((p) => (
            <button key={p.label} type="button" onClick={p.action} className="rounded-full bg-slate-50 border border-slate-200 px-3 py-1 text-xs font-medium text-ink hover:bg-white hover:border-violet-200 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
              {p.label}
            </button>
          ))}
          <span className="text-xs text-ink-soft py-1">· {mode === "month" ? selectedMonths.length : mode === "quarter" ? selectedQuarters.length : mode === "year" ? selectedYears.length : customPeriods.length}/6 selected</span>
          <label className="ml-auto flex items-center gap-2 text-xs font-medium text-ink cursor-pointer">
            <input type="checkbox" checked={normalize} onChange={(e) => setNormalize(e.target.checked)} className="rounded border-slate-300 text-violet-600 focus:ring-violet-400" /> Per-day normalize
          </label>
        </div>

        {/* Mode: Month */}
        {mode === "month" && (
          <div className="space-y-4">
            {/* Year filter for month grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
              {monthsList.map((ym) => {
                const active = selectedMonths.includes(ym);
                return (
                  <button
                    key={ym}
                    type="button"
                    onClick={() => toggleMonth(ym)}
                    aria-pressed={active}
                    className={`rounded-xl sm:rounded-2xl border px-3 py-3 sm:py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${active ? "bg-primary text-white border-primary shadow" : "bg-white border-border hover:border-primary/40 hover:shadow-sm"}`}
                  >
                    <p className={`text-sm font-semibold truncate ${active ? "text-white" : "text-ink"}`}>{monthLabel(ym)}</p>
                    <p className={`text-xs truncate ${active ? "text-violet-100" : "text-ink-soft"}`}>{ym}</p>
                    {active && <span className="mt-1.5 inline-flex rounded-full bg-white/20 px-2 py-0.5 text-xs">✓ selected</span>}
                  </button>
                );
              })}
            </div>
            {selectedMonths.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                {selectedMonths.map((ym) => (
                  <span key={ym} className="inline-flex items-center gap-1 rounded-full bg-violet-50 border border-violet-200 px-3 py-1 text-xs font-medium text-violet-700">
                    {monthLabel(ym)} <button type="button" onClick={() => toggleMonth(ym)} aria-label={`Remove ${monthLabel(ym)}`} className="ml-1 rounded-full bg-white px-1.5 py-0.5 text-violet-700 border hover:bg-violet-50">×</button>
                  </span>
                ))}
                <button type="button" onClick={() => setSelectedMonths([])} className="text-xs text-ink-soft hover:text-ink underline">Clear all</button>
              </div>
            )}
          </div>
        )}

        {/* Mode: Quarter */}
        {mode === "quarter" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
              {quartersList.map((q) => {
                const active = selectedQuarters.includes(q);
                const [y, qq] = q.split("-Q");
                return (
                  <button
                    key={q}
                    type="button"
                    onClick={() => toggleQuarter(q)}
                    aria-pressed={active}
                    className={`rounded-2xl border p-4 sm:p-5 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${active ? "bg-primary text-white border-primary shadow" : "bg-white border-border hover:border-primary/40"}`}
                  >
                    <p className={`text-lg font-bold ${active ? "text-white" : "text-ink"}`}>Q{qq}</p>
                    <p className={`text-sm font-semibold ${active ? "text-white" : "text-ink"}`}>{y}</p>
                    <p className={`text-xs truncate ${active ? "text-violet-100" : "text-ink-soft"}`}>{quarterBounds(Number(y), Number(qq)).label}</p>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-ink-soft">{selectedQuarters.length}/6 quarters — clean QoQ and YoY-Q views.</p>
            {selectedQuarters.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedQuarters.map((q) => (
                  <span key={q} className="inline-flex items-center gap-1 rounded-full bg-violet-50 border border-violet-200 px-3 py-1 text-xs font-medium text-violet-700">{q} <button type="button" onClick={() => toggleQuarter(q)} className="ml-1 rounded-full bg-white px-1 border">×</button></span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mode: Year */}
        {mode === "year" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {yearsList.map((y) => {
                const active = selectedYears.includes(y);
                const label = y === new Date().getFullYear() ? "This year" : y === new Date().getFullYear() - 1 ? "Last year" : "";
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => toggleYear(y)}
                    aria-pressed={active}
                    className={`rounded-2xl border p-5 sm:p-6 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${active ? "bg-primary text-white border-primary shadow" : "bg-white border-border hover:border-primary/40"}`}
                  >
                    <p className={`text-2xl font-bold ${active ? "text-white" : "text-ink"}`}>{y}</p>
                    <p className={`text-xs h-4 ${active ? "text-violet-100" : "text-ink-soft"}`}>{label}</p>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-ink-soft">{selectedYears.length}/6 years — best for YoY and multi-year CAGR.</p>
          </div>
        )}

        {/* Mode: Custom */}
        {mode === "custom" && (
          <div className="space-y-3">
            {customPeriods.map((p, idx) => (
              <div key={p.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:items-end">
                <div className="flex-1 min-w-0">
                  <label htmlFor={`cp-from-${p.id}`} className="block text-xs font-medium text-ink-soft mb-1">From</label>
                  <input id={`cp-from-${p.id}`} type="date" value={p.from} onChange={(e) => setCustomPeriods((prev) => prev.map((x) => (x.id === p.id ? { ...x, from: e.target.value } : x)))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <label htmlFor={`cp-to-${p.id}`} className="block text-xs font-medium text-ink-soft mb-1">To</label>
                  <input id={`cp-to-${p.id}`} type="date" value={p.to} onChange={(e) => setCustomPeriods((prev) => prev.map((x) => (x.id === p.id ? { ...x, to: e.target.value } : x)))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
                <div className="flex-[1.2] min-w-0">
                  <label htmlFor={`cp-label-${p.id}`} className="block text-xs font-medium text-ink-soft mb-1">Label</label>
                  <input id={`cp-label-${p.id}`} type="text" value={p.label} placeholder={`Period ${idx + 1}`} onChange={(e) => setCustomPeriods((prev) => prev.map((x) => (x.id === p.id ? { ...x, label: e.target.value } : x)))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
                <button type="button" onClick={() => setCustomPeriods((prev) => prev.filter((x) => x.id !== p.id))} disabled={customPeriods.length <= 2} className="h-9 sm:h-[42px] rounded-lg border border-slate-200 bg-white px-3 sm:px-4 text-sm font-medium text-ink hover:bg-white disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 shrink-0">Remove</button>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setCustomPeriods((prev) => (prev.length < 6 ? [...prev, { id: safeId(), from: new Date().toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10), label: `Period ${prev.length + 1}` }] : prev))}
                disabled={customPeriods.length >= 6}
                className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              >
                + Add period
              </button>
              <span className="text-xs text-ink-soft">{customPeriods.length}/6 periods · Drag dates or type a label; From/To are inclusive.</span>
            </div>
          </div>
        )}

        {/* Metrics & Dimensions — responsive two-col */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">Metrics</p>
            <p className="text-xs text-ink-soft">Choose what to compare. {canViewPnl ? "P&L included." : "Analyst view hides P&L; manager sees all."}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(meta?.allowed_metrics ?? ["revenue", "orders", "avg_order_value", "gross_margin", "expense_total", "net_profit"])
                .filter((m) => canViewPnl || !["gross_margin", "expense_total", "net_profit"].includes(m))
                .map((m) => {
                  const active = metrics.includes(m);
                  const label = meta?.metric_labels?.[m] ?? m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleMetric(m)}
                      aria-pressed={active}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${active ? "bg-ink text-white border-ink" : "bg-white border-border text-ink hover:border-ink"}`}
                    >
                      {active ? "✓ " : ""}{label}
                    </button>
                  );
                })}
              {!canViewPnl && <span className="text-xs text-ink-muted py-1 ml-1">P&L visible to managers/admins</span>}
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">Break down by</p>
            <p className="text-xs text-ink-soft">Driver analysis per dimension.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(meta?.allowed_dimensions ?? ["category", "channel", "region", "product", "expense_category"])
                .filter((d) => canViewPnl || d !== "expense_category")
                .map((d) => {
                  const active = dimensions.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDim(d)}
                      aria-pressed={active}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${active ? "bg-violet-600 text-white border-violet-600" : "bg-white border-border text-ink hover:border-violet-300"}`}
                    >
                      {active ? "✓ " : ""}{d.replace("_", " ")}
                    </button>
                  );
                })}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100">
          <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
            <input type="checkbox" checked={includeTimeseries} onChange={(e) => setIncludeTimeseries(e.target.checked)} className="rounded border-slate-300 text-violet-600 focus:ring-violet-400" /> Include timeseries overlay
          </label>
          {includeTimeseries && (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <select value={timeseriesMetric} onChange={(e) => setTimeseriesMetric(e.target.value)} className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 min-w-0 flex-1 sm:flex-none">
                {(meta?.allowed_metrics ?? ["revenue", "orders", "avg_order_value"]).map((m) => (
                  <option key={m} value={m}>{meta?.metric_labels?.[m] ?? m}</option>
                ))}
              </select>
              <select value={timeseriesGranularity} onChange={(e) => setTimeseriesGranularity(e.target.value)} className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
              </select>
            </div>
          )}
        </div>

        {/* Action row — responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-4">
          <button
            type="button"
            onClick={handleCompare}
            disabled={!canCompare || compareMut.isPending}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 w-full sm:w-auto ${!canCompare || compareMut.isPending ? "bg-slate-300 cursor-not-allowed" : "bg-primary hover:bg-primary-600 active:scale-[0.98]"}`}
            aria-busy={compareMut.isPending}
          >
            {compareMut.isPending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden /> : <Icon name="trend" className="h-4 w-4" />}
            {compareMut.isPending ? "Comparing…" : "Compare now"}
          </button>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {!canCompare && <span className="inline-flex rounded-full bg-amber-50 border border-amber-200 px-3 py-1 font-medium text-amber-700">Select 2–6 periods to compare</span>}
            {formError && <span className="inline-flex rounded-full bg-red-50 border border-red-200 px-3 py-1 font-medium text-red-700 max-w-full truncate" role="alert">{formError}</span>}
            {result && <span className="text-ink-soft hidden sm:inline">{result.periods.length} periods · {result.kpi_comparison.length} metrics · {Object.keys(result.dimensional).length} dims · {result.meta.timezone}</span>}
          </div>
        </div>
      </Panel>

      {/* Empty / Loading / Results — all responsive */}
      {!result && !compareMut.isPending && (
        <Panel className="border-dashed">
          <div className="py-10 sm:py-12 text-center px-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 border border-violet-100 text-violet-600 text-xl" aria-hidden>◈</div>
            <h3 className="mt-4 text-lg font-semibold text-ink">No comparison yet</h3>
            <p className="mx-auto mt-1 max-w-xl text-sm text-ink-soft leading-relaxed">Pick months, quarters or years above and hit Compare. You’ll get KPI deltas (with per-day normalization), dimensional drivers, timeseries overlays and an AI narrative — all live from the warehouse, no stale snapshot. <span className="hidden sm:inline">Share link copies the current setup.</span></p>
            <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs">
              <Badge variant="secondary">Illustrations</Badge>
              <Badge variant="secondary">Per-day normalize</Badge>
              <Badge variant="secondary">Drivers & watch-outs</Badge>
              <Badge variant="secondary">AI suggestions</Badge>
              <Badge variant="secondary">Export XLSX/CSV</Badge>
            </div>
          </div>
        </Panel>
      )}

      {compareMut.isPending && (
        <Panel>
          <div className="space-y-4 animate-pulse">
            <div className="h-6 bg-slate-100 rounded w-1/3" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="h-48 sm:h-56 bg-slate-100 rounded-2xl" />
              <div className="h-48 sm:h-56 bg-slate-100 rounded-2xl" />
            </div>
            <div className="h-32 bg-slate-100 rounded-2xl" />
          </div>
          <p className="sr-only" aria-live="polite">Loading comparison — fetching live warehouse data…</p>
        </Panel>
      )}

      {result && (
        <>
          {/* Verdict banner — responsive stack on mobile */}
          <div className={`rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${result.insights.verdict.includes("growth") ? "bg-emerald-50 border-emerald-200" : result.insights.verdict.includes("decline") ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"}`}>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-soft">Verdict</p>
              <p className="mt-1 text-base font-semibold text-ink leading-tight">{result.insights.verdict}</p>
              <p className="text-xs text-ink-soft mt-1">{result.insights.method}</p>
              {(result.warnings?.length ?? 0) > 0 && <p className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">⚠ {result.warnings![0]}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button type="button" onClick={exportCsv} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-ink hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">⤓ CSV</button>
              <button type="button" onClick={exportXlsx} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-ink hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">⤓ XLSX</button>
              <button type="button" onClick={() => window.print()} className="hidden sm:inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-ink hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">⎙ Print</button>
            </div>
          </div>

          {/* KPI cards */}
          <KpiCards data={result} normalize={normalize} />

          {/* Grouped bar illustrations */}
          <Panel title={`Illustrations — KPI comparison ${normalize ? "(per-day)" : ""}`} subtitle="One chart per metric — honest scale, no mixed units. Colours = periods. Per-day toggle removes length bias.">
            <GroupedKpiBarChart data={result} normalize={normalize} />
            <div className="mt-6">
              <DeltaHeatTable data={result} normalize={normalize} />
            </div>
          </Panel>

          {/* Dimensional drivers */}
          <Panel title="Dimensional drivers" subtitle="What moved the headline — per dimension, ranked by contribution. Mobile shows cards, desktop shows table + grouped bars.">
            <DimensionalPanels data={result} normalize={normalize} />
          </Panel>

          {/* Timeseries overlay */}
          {result.timeseries_overlay && (
            <Panel title="Timeseries overlay" subtitle="Aligned by position within the period — compare the shape, not just the total. Gaps mean no data, not zero.">
              <TimeseriesOverlayChart overlay={result.timeseries_overlay} />
            </Panel>
          )}

          {/* Deterministic insights — responsive 1→3 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel title="Highlights" subtitle="Material moves (>3%)" className="min-w-0">
              <ul className="space-y-2 text-sm">
                {result.insights.highlights.map((h, i) => (
                  <li key={i} className="flex gap-2 leading-relaxed">
                    <span className="text-emerald-600 shrink-0 mt-0.5" aria-hidden>●</span>
                    <span className="text-ink min-w-0">{h}</span>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel title="Drivers" subtitle="Top contributors" className="min-w-0">
              <ul className="space-y-2 text-sm">
                {result.insights.drivers.length ? result.insights.drivers.map((d, i) => (
                  <li key={i} className="flex gap-2 leading-relaxed">
                    <span className="text-violet-600 shrink-0 mt-0.5" aria-hidden>▸</span>
                    <span className="text-ink min-w-0">{d}</span>
                  </li>
                )) : <li className="text-ink-soft">No single driver dominates — well spread.</li>}
              </ul>
              {result.insights.momentum && result.insights.momentum.length > 0 && (
                <div className="mt-4 rounded-xl bg-violet-50 border border-violet-100 p-3">
                  <p className="text-xs font-semibold text-violet-800">Momentum</p>
                  <ul className="mt-1 space-y-1 text-xs text-violet-700">
                    {result.insights.momentum.map((m, i) => <li key={i}>• {m}</li>)}
                  </ul>
                </div>
              )}
            </Panel>
            <Panel title="Watch-outs" subtitle="Concentration & volatility" className="min-w-0">
              <ul className="space-y-2 text-sm">
                {result.insights.watchouts.length ? result.insights.watchouts.map((w, i) => (
                  <li key={i} className="flex gap-2 leading-relaxed">
                    <span className="text-amber-600 shrink-0 mt-0.5" aria-hidden>⚠</span>
                    <span className="text-ink min-w-0">{w}</span>
                  </li>
                )) : <li className="text-ink-soft">No major watch-outs flagged.</li>}
              </ul>
            </Panel>
          </div>
          {Object.keys(result.insights.stats).length > 0 && (
            <Panel title="Volatility & stats" subtitle="Coefficient of variation, CAGR, per-day context, best/worst period.">
              <div className="flex flex-wrap gap-2">
                {Object.entries(result.insights.stats).map(([k, v]) => (
                  <span key={k} className="rounded-full bg-slate-50 border border-slate-200 px-3 py-1 text-xs text-ink break-all">
                    <span className="font-semibold">{k.replaceAll("_", " ")}:</span> {v as string}
                  </span>
                ))}
              </div>
            </Panel>
          )}

          {/* AI Suggestions — responsive */}
          <Panel
            title="AI suggestions"
            subtitle={
              ai
                ? `Source: ${ai.source} · ${ai.disclaimer}`
                : aiMut.isPending
                ? "Generating — Groq → Gemini → deterministic fallback…"
                : "On-demand narrative grounded in the live comparison. Per-day figures are used when lengths differ."
            }
            action={
              <button
                type="button"
                onClick={handleAI}
                disabled={aiMut.isPending}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 w-full sm:w-auto ${aiMut.isPending ? "bg-slate-400 cursor-not-allowed" : "bg-violet-600 hover:bg-violet-700 active:scale-[0.98]"}`}
              >
                {aiMut.isPending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden /> : <span aria-hidden>✦</span>}
                {ai ? "Regenerate" : aiMut.isPending ? "Thinking…" : "Generate AI suggestions"}
              </button>
            }
          >
            {aiMut.isError && aiError && <p className="text-sm text-red-600" role="alert">{aiError}</p>}
            {!ai && !aiMut.isPending && (
              <div className="rounded-xl border border-violet-100 bg-violet-50 p-4 text-sm text-violet-900">
                <p className="font-semibold">What you’ll get</p>
                <ul className="mt-2 list-disc pl-4 space-y-1 text-violet-800 leading-relaxed">
                  <li>Executive summary — strongest vs weakest period, per-day context when lengths differ.</li>
                  <li>What drove the change — tied to a specific category / channel / region with NPR figures and CV.</li>
                  <li>Risks, opportunities and 3 next actions a manager should take this week.</li>
                </ul>
                <p className="mt-3 text-xs text-violet-700">All figures are quoted only from the comparison tables — the model never invents a number. Enable Groq/Gemini for LLM enrichment; otherwise deterministic is used.</p>
              </div>
            )}
            {ai && (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-soft">Executive summary</p>
                  <p className="mt-1 text-sm font-medium text-ink leading-relaxed">{(ai.sections as Record<string, unknown>)?.summary as string ?? ai.summary}</p>
                </div>
                <div className="rounded-xl border border-border bg-white p-4 sm:p-5 min-w-0">
                  <div className="prose prose-sm max-w-none prose-p:text-ink prose-li:text-ink prose-strong:text-ink">
                    {ai.narrative.split("\n").map((line, i) => {
                      const trimmed = line.trim();
                      if (!trimmed) return <div key={i} className="h-2" />;
                      if (trimmed.startsWith("**") || trimmed.startsWith("#")) return <p key={i} className="font-semibold text-ink mt-3 text-sm sm:text-base break-words">{trimmed.replaceAll("**", "").replaceAll("#", "").trim()}</p>;
                      if (trimmed.startsWith("-") || trimmed.startsWith("•")) return <li key={i} className="ml-4 list-disc text-sm text-ink leading-relaxed break-words">{trimmed.replace(/^[-•]\s*/, "")}</li>;
                      if (/^\d+\)/.test(trimmed)) return <p key={i} className="font-semibold text-ink mt-3 text-sm break-words">{trimmed}</p>;
                      return <p key={i} className="text-sm leading-relaxed text-ink break-words">{trimmed}</p>;
                    })}
                  </div>
                </div>
                {typeof ai.sections === "object" && ai.sections && "what_drove" in ai.sections && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(["what_drove", "risks", "opportunities", "next_actions"] as const).map((k) => {
                      const vals = (ai.sections as Record<string, unknown>)[k] as string[] | undefined;
                      if (!vals || !Array.isArray(vals) || vals.length === 0) return null;
                      const labels: Record<string, string> = { what_drove: "What drove the change", risks: "Risks", opportunities: "Opportunities", next_actions: "Next actions" };
                      return (
                        <div key={k} className="rounded-xl border border-slate-200 bg-white p-4 min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-soft">{labels[k]}</p>
                          <ul className="mt-2 space-y-1.5 text-sm text-ink">
                            {vals.map((v, i) => (
                              <li key={i} className="flex gap-2 leading-relaxed"><span className="text-violet-600 shrink-0" aria-hidden>•</span><span className="min-w-0 break-words">{v}</span></li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                )}
                <p className="text-xs text-ink-muted border-t border-slate-100 pt-3 break-words">{ai.disclaimer}</p>
              </div>
            )}
          </Panel>

          {/* Meta footer — responsive wrap */}
          <div className="rounded-2xl border border-border bg-slate-50 p-4 flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4 text-xs text-ink-soft">
            <span>Generated {result.meta.generated_at} · {result.meta.timezone}{result.meta.cached ? " · cached" : ""}</span>
            <span>Org-scoped: {result.meta.org_scoped ? "yes" : "platform"}</span>
            <span className="truncate">{result.periods.map((p) => p.label).join(" vs ")}</span>
            <span className="sm:ml-auto">Compare v2 · deterministic + LLM · per-day + CAGR + CV</span>
          </div>
        </>
      )}
    </>
  );
}
