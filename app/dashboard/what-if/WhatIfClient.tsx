"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/Icon";
import { npr, useApi, queryKeys, apiPost } from "@/lib/api";
import { useFilters, apiParams } from "@/lib/filters";
import type { PnlRow, PeriodProjection, ScenarioResult } from "@/lib/api";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell, LineChart, Line } from "recharts";

// ── Types ───────────────────────────────────────────────────────────────────
type WhatIfParams = {
  ordersDeltaPct: number;
  aovDeltaPct: number;
  expenseDeltaPct: number;
  variablePct: number; // 0-100 % of expenses that scale with orders
  inventoryDeltaPct: number;
  priceDeltaPct: number; // legacy combined alias -> aov
};

type MonteCarloOut = {
  point: { ds: string; y: number }[];
  p10: { ds: string; y: number }[];
  p50: { ds: string; y: number }[];
  p90: { ds: string; y: number }[];
  scenarios?: Record<string, { ds: string; y: number }[]>;
  band_width?: number;
  model_mape?: number;
  resid_std?: number;
  warning?: string | null;
  confidence?: number;
};

// ── Small UI atoms ───────────────────────────────────────────────────────────
function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  hint,
  accent,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-ink">{label}</label>
        <span
          className={`text-sm font-bold px-2.5 py-1 rounded-full border ${
            value > 0
              ? "text-green-700 bg-green-50 border-green-200"
              : value < 0
                ? "text-orange-700 bg-orange-50 border-orange-200"
                : "text-slate-600 bg-slate-50 border-slate-200"
          }`}
        >
          {value > 0 ? "+" : ""}
          {value}%
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-violet-600"
        aria-label={label}
      />
      <div className="flex justify-between text-[11px] text-ink-muted">
        <span>{min}%</span>
        <span>{max}%</span>
      </div>
      {hint && <p className="text-xs text-ink-soft leading-relaxed">{hint}</p>}
      {accent && <p className="text-[11px] text-violet-600 font-medium">{accent}</p>}
    </div>
  );
}

function MetricDelta({
  label,
  baseline,
  scenario,
  format = npr,
  sublabel,
}: {
  label: string;
  baseline: number;
  scenario: number;
  format?: (n: number) => string;
  sublabel?: string;
}) {
  const delta = scenario - baseline;
  const deltaPct = baseline !== 0 ? (delta / Math.abs(baseline)) * 100 : 0;
  const positive = delta >= 0;
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">{label}</p>
        {sublabel && <span className="text-[11px] text-ink-muted">{sublabel}</span>}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <div>
          <p className="text-[11px] text-ink-muted">Baseline</p>
          <p className="font-semibold text-ink">{format(baseline)}</p>
        </div>
        <div>
          <p className="text-[11px] text-ink-muted">Scenario</p>
          <p className="font-bold text-ink">{format(scenario)}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-ink-muted">Delta</p>
          <p className={`font-bold ${positive ? "text-green-600" : "text-orange-600"}`}>
            {positive ? "+" : ""}
            {format(delta)}{" "}
            <span className="text-xs font-medium">
              ({deltaPct >= 0 ? "+" : ""}
              {deltaPct.toFixed(1)}%)
            </span>
          </p>
        </div>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full ${positive ? "bg-green-500" : "bg-orange-500"}`}
          style={{ width: `${Math.min(100, Math.abs(deltaPct) * 2.5)}%` }}
        />
      </div>
    </div>
  );
}

// ── Isolated workspace + freshness banner ───────────────────────────────────
function IsolatedBanner({
  coverage,
  projection,
}: {
  coverage: { sales: { row_count: number }; days_behind?: number | null } | undefined;
  projection: PeriodProjection | null;
}) {
  const stale = projection?.is_stale;
  const daysBehind = coverage && (coverage as any).days_behind;
  return (
    <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600 text-white">
            <Icon name="lock" className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-violet-900">Isolated workspace</p>
            <p className="text-xs text-violet-700">Analytics use only your organization’s data — never mixed with others.</p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-white border-violet-200 text-violet-700">
          Tenant-isolated • {coverage?.sales.row_count?.toLocaleString() ?? "—"} rows
        </Badge>
      </div>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        <div className="rounded-xl bg-white border border-violet-100 px-3 py-2">
          <p className="text-ink-muted">Data freshness</p>
          <p className={`font-medium ${stale || (daysBehind ?? 0) > 3 ? "text-orange-600" : "text-green-700"}`}>
            {stale ? "Stale — projection uses last available window" : daysBehind != null && daysBehind > 3 ? `${daysBehind} days behind` : "Fresh — up to business_today"}
          </p>
          <p className="text-[11px] text-ink-muted mt-0.5">{projection?.method ?? "flat run-rate"}</p>
        </div>
        <div className="rounded-xl bg-white border border-violet-100 px-3 py-2">
          <p className="text-ink-muted">Confidence</p>
          <p className="font-medium text-ink">
            {projection ? `${(projection.confidence * 100).toFixed(0)}% band • ${projection.band_method}` : "—"}
          </p>
          <p className="text-[11px] text-ink-muted">Coverage: {projection?.coverage ? "adequate" : "sparse"}</p>
        </div>
        <div className="rounded-xl bg-white border border-violet-100 px-3 py-2">
          <p className="text-ink-muted">Accuracy basis</p>
          <p className="font-medium text-ink">Isolated per-org KPIs + weekday profile</p>
          <p className="text-[11px] text-ink-muted">Zero-filled history • residuals after profile</p>
        </div>
      </div>
    </div>
  );
}

// ── Projection cone chart ────────────────────────────────────────────────────
function ProjectionCone({ proj }: { proj: PeriodProjection | null }) {
  if (!proj) return <div className="py-8 text-center text-sm text-ink-muted">No projection yet — need at least 7 days of history.</div>;
  const data = proj.daily_cone.map((d) => ({
    date: d.date.slice(5), // MM-DD
    lower: d.lower,
    projected: d.projected,
    upper: d.upper,
    daily: d.daily_value,
  }));
  // prepend actual_to_date point
  const chartData = [{ date: proj.period_start.slice(5), projected: proj.actual_to_date, lower: proj.actual_to_date, upper: proj.actual_to_date }, ...data];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-ink">
            {proj.period} projection • {proj.days_elapsed} of {proj.days_elapsed + proj.days_remaining} days elapsed
          </p>
          <p className="text-xs text-ink-muted">
            {proj.method} {proj.is_stale ? "• stale" : ""} • {proj.coverage ? "" : "sparse coverage"}
          </p>
        </div>
        <Badge variant={proj.is_stale ? "warning" : "success"}>{proj.is_stale ? "Stale" : "Fresh"}</Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-slate-50 border border-border p-3">
          <p className="text-[11px] text-ink-muted">Actual to date</p>
          <p className="font-bold text-ink">{npr(proj.actual_to_date)}</p>
          <p className="text-xs text-ink-muted">{proj.daily_run_rate.toFixed(0)}/day</p>
        </div>
        <div className="rounded-xl bg-violet-50 border border-violet-200 p-3">
          <p className="text-[11px] text-violet-700">Projected total</p>
          <p className="font-bold text-violet-900">{npr(proj.projected_total)}</p>
          <p className="text-xs text-violet-700">
            {npr(proj.lower_bound)} – {npr(proj.upper_bound)}
          </p>
        </div>
        <div className="rounded-xl bg-white border border-border p-3">
          <p className="text-[11px] text-ink-muted">Remaining</p>
          <p className="font-bold text-ink">{npr(proj.projected_remainder)}</p>
          <p className="text-xs text-ink-muted">± {npr(proj.daily_band)}/day</p>
        </div>
      </div>

      <div className="h-[240px] rounded-2xl border border-border bg-white p-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis tickFormatter={(v) => ` ${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(v: any) => npr(Number(v))}
              labelFormatter={(l) => `Date: ${l}`}
              contentStyle={{ fontSize: 12, borderRadius: 12 } as any}
            />
            <Area type="monotone" dataKey="upper" stroke="none" fill="#ddd6fe" fillOpacity={0.6} />
            <Area type="monotone" dataKey="lower" stroke="none" fill="#ffffff" fillOpacity={1} />
            <Area type="monotone" dataKey="projected" stroke="#7c3aed" strokeWidth={2} fill="none" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-ink-muted text-center">
        Shaded band is {(proj.confidence * 100).toFixed(0)}% confidence ({proj.band_method}) — widens with √(days remaining) using residual std after weekday profile. Daily cone expands as uncertainty accumulates.
      </p>
    </div>
  );
}

// ── Monte Carlo fan ──────────────────────────────────────────────────────────
function MonteCarloFan({ series }: { series: MonteCarloOut | null }) {
  if (!series || !series.point?.length) return null;
  const data = series.point.map((_, i) => ({
    ds: series.point[i]?.ds?.slice(5) ?? `${i}`,
    p10: series.p10[i]?.y ?? 0,
    p50: series.p50[i]?.y ?? 0,
    p90: series.p90[i]?.y ?? 0,
    point: series.point[i]?.y ?? 0,
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">Stochastic forecast — empirical residual bootstrap</p>
        {series.band_width != null && <Badge variant="secondary">band {npr(series.band_width)}</Badge>}
      </div>
      <div className="h-[260px] rounded-2xl border border-border bg-white p-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="ds" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: any) => npr(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 12 } as any} />
            <Area dataKey="p90" stroke="none" fill="#ddd6fe" fillOpacity={0.4} />
            <Area dataKey="p10" stroke="none" fill="#ffffff" fillOpacity={1} />
            <Line type="monotone" dataKey="p50" stroke="#7c3aed" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="point" stroke="#a78bfa" strokeDasharray="4 3" strokeWidth={1.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-xl bg-slate-50 border border-border p-2 text-center">
          <p className="text-ink-muted">MAPE</p>
          <p className="font-semibold text-ink">{series.model_mape != null ? `${series.model_mape.toFixed(1)}%` : "—"}</p>
        </div>
        <div className="rounded-xl bg-slate-50 border border-border p-2 text-center">
          <p className="text-ink-muted">Residual σ</p>
          <p className="font-semibold text-ink">{series.resid_std?.toFixed(0) ?? "—"}</p>
        </div>
        <div className="rounded-xl bg-slate-50 border border-border p-2 text-center">
          <p className="text-ink-muted">Confidence</p>
          <p className="font-semibold text-ink">{series.confidence ? `${(series.confidence * 100).toFixed(0)}%` : "80%"}</p>
        </div>
      </div>
      {series.warning && <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{series.warning}</p>}
    </div>
  );
}

// ── Main client ──────────────────────────────────────────────────────────────
export default function WhatIfClient() {
  const { filters } = useFilters();
  const { data: pnl } = useApi<PnlRow[]>("/finance/pnl", apiParams(filters));
  const { data: coverage } = useApi<{ sales: { row_count: number }; days_behind?: number | null }>("/data-coverage");
  const { data: projMonth } = useApi<PeriodProjection>("/ml/projections/current", { metric: "revenue", period: "month" });
  const { data: projQuarter } = useApi<PeriodProjection>("/ml/projections/current", { metric: "revenue", period: "quarter" });

  const [params, setParams] = useState<WhatIfParams>({
    ordersDeltaPct: 0,
    aovDeltaPct: 0,
    expenseDeltaPct: 0,
    variablePct: 30,
    inventoryDeltaPct: 0,
    priceDeltaPct: 0,
  });
  const [activePeriod, setActivePeriod] = useState<"month" | "quarter">("month");
  const [horizon, setHorizon] = useState(30);
  const [monte, setMonte] = useState<MonteCarloOut | null>(null);
  const [monteLoading, setMonteLoading] = useState(false);

  // Map legacy price slider to AOV
  useEffect(() => {
    if (params.priceDeltaPct !== 0 && params.aovDeltaPct === 0) {
      setParams((s) => ({ ...s, aovDeltaPct: s.priceDeltaPct }));
    }
  }, [params.priceDeltaPct, params.aovDeltaPct]);

  const baseline = useMemo(() => {
    if (!pnl || pnl.length === 0) return { revenue: 0, expenses: 0, net: 0, margin: 0, orders: 0 };
    const revenue = pnl.reduce((s, r) => s + r.revenue, 0);
    const expenses = pnl.reduce((s, r) => s + r.expenses, 0);
    const net = pnl.reduce((s, r) => s + r.net, 0);
    const margin = revenue > 0 ? (net / revenue) * 100 : 0;
    // orders not in P&L directly — approximate via coverage if needed
    return { revenue, expenses, net, margin, orders: 0 };
  }, [pnl]);

  const [scenario, setScenario] = useState<ScenarioResult | null>(null);
  const [scLoading, setScLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setScLoading(true);
    apiPost<ScenarioResult>("/ml/scenario/simulate", {
      period: activePeriod,
      orders_change_pct: params.ordersDeltaPct,
      aov_change_pct: params.aovDeltaPct || params.priceDeltaPct,
      expense_change_pct: params.expenseDeltaPct,
      variable_pct: params.variablePct,
    })
      .then((res) => {
        if (!cancelled) setScenario(res);
      })
      .catch(() => {
        // fallback to deterministic client math so UI never blanks
        const priceFactor = 1 + (params.aovDeltaPct || params.priceDeltaPct) / 100;
        const ordersFactor = 1 + params.ordersDeltaPct / 100;
        const revenueFactor = priceFactor * ordersFactor - 1;
        const revenue = baseline.revenue * (1 + revenueFactor);
        const varPct = Math.max(0, Math.min(100, params.variablePct)) / 100;
        const variablePart = baseline.expenses * varPct;
        const fixedPart = baseline.expenses * (1 - varPct);
        const expenses = variablePart * (1 + params.ordersDeltaPct / 100) + fixedPart * (1 + params.expenseDeltaPct / 100);
        const profit = revenue - expenses;
        if (!cancelled)
          setScenario({
            assumptions: { orders_change_pct: params.ordersDeltaPct, aov_change_pct: params.aovDeltaPct, expense_change_pct: params.expenseDeltaPct, variable_pct: params.variablePct },
            baseline: { revenue: baseline.revenue, orders: baseline.orders, avg_order_value: 0, expenses: baseline.expenses, profit: baseline.net },
            scenario: { revenue, orders: 0, avg_order_value: 0, expenses, profit },
            delta: { revenue: revenue - baseline.revenue, profit: profit - baseline.net, revenue_pct: baseline.revenue ? ((revenue - baseline.revenue) / baseline.revenue) * 100 : null, profit_pct: baseline.net ? ((profit - baseline.net) / Math.abs(baseline.net)) * 100 : null },
          });
      })
      .finally(() => {
        if (!cancelled) setScLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [baseline.revenue, baseline.expenses, baseline.net, baseline.orders, params.ordersDeltaPct, params.aovDeltaPct, params.priceDeltaPct, params.expenseDeltaPct, params.variablePct, activePeriod]);

  const s = scenario;
  const proj = activePeriod === "month" ? projMonth : projQuarter;

  const presets: { label: string; params: WhatIfParams }[] = [
    { label: "Conservative", params: { ordersDeltaPct: -5, aovDeltaPct: 0, expenseDeltaPct: 5, variablePct: 30, inventoryDeltaPct: -5, priceDeltaPct: 0 } },
    { label: "Aggressive Growth", params: { ordersDeltaPct: 15, aovDeltaPct: 3, expenseDeltaPct: 8, variablePct: 30, inventoryDeltaPct: 10, priceDeltaPct: 3 } },
    { label: "Cost Squeeze", params: { ordersDeltaPct: -5, aovDeltaPct: 0, expenseDeltaPct: -12, variablePct: 40, inventoryDeltaPct: -8, priceDeltaPct: 0 } },
    { label: "Price Hike", params: { ordersDeltaPct: -3, aovDeltaPct: 8, expenseDeltaPct: 0, variablePct: 30, inventoryDeltaPct: 0, priceDeltaPct: 8 } },
    { label: "Operational Stress", params: { ordersDeltaPct: 10, aovDeltaPct: -4, expenseDeltaPct: 12, variablePct: 60, inventoryDeltaPct: -15, priceDeltaPct: -4 } },
  ];

  const loadMonte = async () => {
    setMonteLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "";
      // Use advanced endpoint which is isolated via FiltersDep
      const qs = new URLSearchParams({ metric: "revenue", horizon: String(horizon), n_paths: "500" }).toString();
      const token = (await import("@/lib/auth")).getToken();
      const url = `${(base || "/api/v1").replace(/\/$/, "")}/advanced/forecast-scenarios?${qs}`;
      // fallback to relative if no base
      const res = await fetch(url.startsWith("http") ? url : `/api/v1/advanced/forecast-scenarios?${qs}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setMonte(data);
    } catch (e) {
      console.warn("monte carlo failed", e);
    } finally {
      setMonteLoading(false);
    }
  };

  const baselineRevenue = s?.baseline.revenue ?? baseline.revenue;
  const scenarioRevenue = s?.scenario.revenue ?? baselineRevenue;
  const baselineProfit = s?.baseline.profit ?? baseline.net;
  const scenarioProfit = s?.scenario.profit ?? baselineProfit;

  return (
    <>
      <PageHeader
        title="What-If Simulation"
        subtitle="Isolated projection + stochastic scenario • deterministic when you need a number, probabilistic when you need a band"
        action={
          <div className="flex flex-wrap gap-2">
            <select
              value={activePeriod}
              onChange={(e) => setActivePeriod(e.target.value as any)}
              className="h-9 rounded-xl border border-border bg-white px-3 text-sm"
            >
              <option value="month">This month</option>
              <option value="quarter">This quarter</option>
            </select>
            <button
              onClick={() => setParams({ ordersDeltaPct: 0, aovDeltaPct: 0, expenseDeltaPct: 0, variablePct: 30, inventoryDeltaPct: 0, priceDeltaPct: 0 })}
              className="px-3 py-1.5 text-xs font-medium rounded-xl border border-border bg-white hover:bg-slate-50"
            >
              Reset
            </button>
            <Badge variant="secondary" className="hidden sm:inline-flex">
              Read-only simulation
            </Badge>
          </div>
        }
      />

      <IsolatedBanner coverage={coverage as any} projection={proj ?? null} />

      {/* Presets */}
      <div className="flex flex-wrap gap-2 my-4">
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() => setParams(p.params)}
            className="px-3.5 py-1.5 text-xs font-medium rounded-full border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={loadMonte}
          disabled={monteLoading}
          className="ml-auto px-3.5 py-1.5 text-xs font-medium rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
        >
          {monteLoading ? "Loading fan…" : `Load Monte Carlo (horizon ${horizon}d)`}
        </button>
        <select value={horizon} onChange={(e) => setHorizon(Number(e.target.value))} className="h-7 rounded-full border border-border bg-white px-2 text-xs">
          <option value={14}>14d</option>
          <option value={30}>30d</option>
          <option value={60}>60d</option>
          <option value={90}>90d</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Controls */}
        <Panel title="Scenario levers" subtitle="Isolated simulation — your baseline never leaks to another workspace" className="lg:col-span-1">
          <div className="space-y-6">
            <Slider
              label="Orders change"
              value={params.ordersDeltaPct}
              min={-50}
              max={50}
              onChange={(v) => setParams((s) => ({ ...s, ordersDeltaPct: v }))}
              hint="Volume lever. Affects revenue via orders × AOV and optionally variable expenses."
            />
            <Slider
              label="Average order value change"
              value={params.aovDeltaPct}
              min={-30}
              max={30}
              onChange={(v) => setParams((s) => ({ ...s, aovDeltaPct: v, priceDeltaPct: v }))}
              hint="Price / basket lever. Multiplies with orders: (1+price)×(1+orders)−1 is the revenue effect."
            />
            <Slider
              label="Expense change"
              value={params.expenseDeltaPct}
              min={-50}
              max={50}
              onChange={(v) => setParams((s) => ({ ...s, expenseDeltaPct: v }))}
              hint="Fixed cost lever. Variable portion below scales with orders instead."
            />
            <Slider
              label="Variable expense share"
              value={params.variablePct}
              min={0}
              max={100}
              onChange={(v) => setParams((s) => ({ ...s, variablePct: v }))}
              hint="What % of expenses move with orders (logistics, COGS). 0 = all fixed, 100 = all variable."
              accent="Couples expenses to volume for accurate profit: variable scales with orders, fixed with expense lever."
            />
            <Slider
              label="Inventory change"
              value={params.inventoryDeltaPct}
              min={-50}
              max={50}
              onChange={(v) => setParams((s) => ({ ...s, inventoryDeltaPct: v }))}
              hint="Operational flag only — carrying cost not in P&L. Shows stock-out / overstock risk."
            />
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              <p className="font-semibold">Methodology — accurate & isolated</p>
              <p className="mt-1 leading-relaxed">
                Baseline = isolated KPIs for the selected period in <strong>your</strong> workspace (org_id filter). Scenario revenue = <code className="bg-white px-1 rounded">baseline × (1+aov)×(1+orders)</code> — not additive. Expenses split:{" "}
                <code className="bg-white px-1 rounded">variable×(1+orders) + fixed×(1+expense)</code>. Handling for <code className="bg-white px-1 rounded">orders==0</code> uses historical median AOV (90d) so the lift isn’t silently 0. Profit % shown even when baseline profit ≈0 is guarded.
              </p>
              <p className="mt-2 text-[11px] text-amber-700/80">Deterministic arithmetic — use Monte Carlo on the right for probabilistic bands.</p>
            </div>
          </div>
        </Panel>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {/* Projection cone */}
          <Panel title={`Where ${activePeriod} lands`} subtitle="Weekday-adjusted run-rate + 95% cone (residuals after profile, √(n) widening)">
            <ProjectionCone proj={proj ?? null} />
          </Panel>

          {/* Scenario deltas with backend grounding */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MetricDelta
              label="Revenue"
              baseline={baselineRevenue}
              scenario={scenarioRevenue}
              sublabel={s?.delta.revenue_pct != null ? `${s.delta.revenue_pct.toFixed(1)}%` : undefined}
            />
            <MetricDelta
              label="Expenses"
              baseline={s?.baseline.expenses ?? baseline.expenses}
              scenario={s?.scenario.expenses ?? baseline.expenses}
            />
            <MetricDelta
              label="Net Profit"
              baseline={baselineProfit}
              scenario={scenarioProfit}
              sublabel={s?.delta.profit_pct != null ? `${s.delta.profit_pct.toFixed(1)}%` : undefined}
            />
            <MetricDelta
              label="Profit margin"
              baseline={baselineRevenue ? (baselineProfit / baselineRevenue) * 100 : 0}
              scenario={scenarioRevenue ? (scenarioProfit / scenarioRevenue) * 100 : 0}
              format={(n) => `${n.toFixed(1)}%`}
            />
          </div>

          {/* Scenario summary with grounding */}
          <Panel title="Scenario summary" subtitle="Delta vs isolated baseline — grounded in live KPIs, not a forecast model">
            {scLoading ? (
              <div className="flex items-center justify-center py-8 text-sm text-ink-muted">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-300 border-t-violet-600 mr-2" />
                Computing isolated scenario…
              </div>
            ) : s ? (
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-border">
                  <span className="text-ink-soft">Revenue delta</span>
                  <span className={`font-bold ${s.delta.revenue >= 0 ? "text-green-600" : "text-orange-600"}`}>
                    {npr(s.delta.revenue)} {s.delta.revenue_pct != null ? `(${s.delta.revenue_pct.toFixed(1)}%)` : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-border">
                  <span className="text-ink-soft">Profit delta</span>
                  <span className={`font-bold ${s.delta.profit >= 0 ? "text-green-600" : "text-orange-600"}`}>
                    {npr(s.delta.profit)} {s.delta.profit_pct != null ? `(${s.delta.profit_pct.toFixed(1)}%)` : ""}
                  </span>
                </div>
                {/* Sensitivity mini bars */}
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold text-ink">Assumptions (isolated)</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between bg-slate-50 rounded-lg px-2 py-1">
                      <span className="text-ink-muted">Orders</span>
                      <span className="font-medium">{s.assumptions.orders_change_pct}%</span>
                    </div>
                    <div className="flex justify-between bg-slate-50 rounded-lg px-2 py-1">
                      <span className="text-ink-muted">AOV</span>
                      <span className="font-medium">{s.assumptions.aov_change_pct}%</span>
                    </div>
                    <div className="flex justify-between bg-slate-50 rounded-lg px-2 py-1">
                      <span className="text-ink-muted">Expenses</span>
                      <span className="font-medium">{s.assumptions.expense_change_pct}%</span>
                    </div>
                    <div className="flex justify-between bg-slate-50 rounded-lg px-2 py-1">
                      <span className="text-ink-muted">Variable</span>
                      <span className="font-medium">{s.assumptions.variable_pct}%</span>
                    </div>
                  </div>
                  {s.assumptions.historical_median_aov ? (
                    <p className="mt-2 text-[11px] text-ink-muted">Historical median AOV used: {npr(s.assumptions.historical_median_aov)} (for orders==0 guard)</p>
                  ) : null}
                </div>
                <div className="flex items-start gap-2 p-3 rounded-2xl bg-violet-50 border border-violet-200">
                  <span className="mt-0.5 text-violet-600">▸</span>
                  <div>
                    <p className="font-medium text-violet-900">Inventory signal</p>
                    <p className="text-violet-700 text-xs mt-1">
                      {params.inventoryDeltaPct < -10
                        ? "Stock-out risk: inventory reduction may hurt fulfilment"
                        : params.inventoryDeltaPct > 15
                          ? "Overstock risk: carrying cost increases"
                          : "Inventory in balanced range"}
                    </p>
                  </div>
                </div>
                {/* Visual delta bar: revenue vs profit */}
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold text-ink">Waterfall intuition</p>
                  <div className="mt-2 flex items-center gap-1 h-8">
                    <div className="flex-1 h-full rounded-l-xl bg-slate-100 flex items-center justify-center text-[11px] text-ink-muted">Baseline {npr(baselineRevenue)}</div>
                    <div className={`h-full flex items-center justify-center text-xs font-bold text-white px-2 ${s.delta.revenue >= 0 ? "bg-green-500" : "bg-orange-500"}`} style={{ width: `${Math.min(40, Math.abs(s.delta.revenue_pct ?? 0) * 2)}%`, minWidth: 60 }}>
                      {s.delta.revenue >= 0 ? "+" : ""}
                      {npr(s.delta.revenue)}
                    </div>
                    <div className="flex-1 h-full rounded-r-xl bg-violet-50 border border-violet-200 flex items-center justify-center text-[11px] text-violet-700">Scenario {npr(scenarioRevenue)}</div>
                  </div>
                  <p className="mt-2 text-[11px] text-ink-muted">Revenue delta is multiplicative (price × volume). Profit = revenue − expenses (variable scales with orders).</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-muted">No scenario yet.</p>
            )}
          </Panel>

          {/* Monte Carlo */}
          {(monte || monteLoading) && (
            <Panel title="Monte Carlo fan" subtitle="Empirical residual bootstrap — not Gaussian, horizon-aware, seed-randomized per request">
              {monteLoading ? (
                <div className="py-8 text-center text-sm text-ink-muted">Generating 500 paths…</div>
              ) : (
                <MonteCarloFan series={monte} />
              )}
            </Panel>
          )}

          <Panel title="Baseline details" subtitle="Isolated source of truth — your org only">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-ink-muted">
                    <th className="pb-2 pr-4">Month</th>
                    <th className="pb-2 pr-4 text-right">Revenue</th>
                    <th className="pb-2 pr-4 text-right">Expenses</th>
                    <th className="pb-2 pr-4 text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {(pnl ?? []).slice(-6).map((r) => (
                    <tr key={r.month} className="border-b border-slate-100">
                      <td className="py-2 pr-4 text-ink-soft">{r.month}</td>
                      <td className="py-2 pr-4 text-right font-mono">{npr(r.revenue)}</td>
                      <td className="py-2 pr-4 text-right font-mono">{npr(r.expenses)}</td>
                      <td className={`py-2 pr-4 text-right font-bold ${r.net >= 0 ? "text-green-600" : "text-orange-600"}`}>{npr(r.net)}</td>
                    </tr>
                  ))}
                  {(!pnl || pnl.length === 0) && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-ink-soft">
                        No P&L data for selected period — adjust date range or upload data.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
