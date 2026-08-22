"use client";

import { useMemo, useState } from "react";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import Badge from "@/components/ui/Badge";
import { npr } from "@/lib/api";
import { useApi } from "@/lib/api";
import { useFilters, apiParams } from "@/lib/filters";
import type { PnlRow } from "@/lib/api";

type WhatIfParams = {
  salesDeltaPct: number; // -50 to +50
  costDeltaPct: number; // -50 to +50
  inventoryDeltaPct: number; // -50 to +50
  priceDeltaPct: number; // -20 to +20
};

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-ink">{label}</label>
        <span
          className={`text-sm font-bold px-2 py-0.5 rounded-full border ${
            value > 0
              ? "text-green-700 bg-green-50 border-green-200"
              : value < 0
                ? "text-orange-700 bg-orange-50 border-orange-200"
                : "text-slate-600 bg-slate-50 border-slate-200"
          }`}
          aria-live="polite"
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
      <div className="flex justify-between text-xs text-ink-muted">
        <span>{min}%</span>
        <span>{max}%</span>
      </div>
      {hint && <p className="text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

function MetricDelta({
  label,
  baseline,
  scenario,
  format = npr,
}: {
  label: string;
  baseline: number;
  scenario: number;
  format?: (n: number) => string;
}) {
  const delta = scenario - baseline;
  const deltaPct = baseline !== 0 ? (delta / Math.abs(baseline)) * 100 : 0;
  const positive = delta >= 0;
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <p className="text-xs font-medium text-ink-soft">{label}</p>
      <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
        <div>
          <p className="text-xs text-ink-muted">Baseline</p>
          <p className="font-semibold text-ink">{format(baseline)}</p>
        </div>
        <div>
          <p className="text-xs text-ink-muted">Scenario</p>
          <p className="font-bold text-ink">{format(scenario)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-ink-muted">Delta</p>
          <p className={`font-bold ${positive ? "text-green-600" : "text-orange-600"}`}>
            {positive ? "+" : ""}
            {format(delta)} <span className="text-xs">({deltaPct >= 0 ? "+" : ""}{deltaPct.toFixed(1)}%)</span>
          </p>
        </div>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full ${positive ? "bg-green-500" : "bg-orange-500"}`}
          style={{ width: `${Math.min(100, Math.abs(deltaPct) * 2)}%` }}
        />
      </div>
    </div>
  );
}

export default function WhatIfClient() {
  const { filters } = useFilters();
  const { data: pnl } = useApi<PnlRow[]>("/finance/pnl", apiParams(filters));
  const { data: coverage } = useApi<{ sales: { row_count: number } }>("/data-coverage");

  const [params, setParams] = useState<WhatIfParams>({
    salesDeltaPct: 0,
    costDeltaPct: 0,
    inventoryDeltaPct: 0,
    priceDeltaPct: 0,
  });

  const baseline = useMemo(() => {
    if (!pnl || pnl.length === 0) return { revenue: 0, expenses: 0, net: 0, margin: 0 };
    const revenue = pnl.reduce((s, r) => s + r.revenue, 0);
    const expenses = pnl.reduce((s, r) => s + r.expenses, 0);
    const net = pnl.reduce((s, r) => s + r.net, 0);
    const margin = revenue > 0 ? (net / revenue) * 100 : 0;
    return { revenue, expenses, net, margin };
  }, [pnl]);

  const scenario = useMemo(() => {
    // Transparent assumptions — Power BI What-If style:
    // Sales delta applies to revenue; price delta compounds via (1+price)*(1+sales)-1
    // Cost delta applies to expenses; inventory delta does not affect P&L directly but
    // signals risk (shown separately).
    const priceFactor = 1 + params.priceDeltaPct / 100;
    const salesFactor = 1 + params.salesDeltaPct / 100;
    const revenueFactor = priceFactor * salesFactor - 1; // combined effect
    const revenue = baseline.revenue * (1 + revenueFactor);
    const expenses = baseline.expenses * (1 + params.costDeltaPct / 100);
    const net = revenue - expenses;
    const margin = revenue > 0 ? (net / revenue) * 100 : 0;
    const inventoryRisk =
      params.inventoryDeltaPct < -10
        ? "Stock-out risk: inventory reduction may hurt fulfilment"
        : params.inventoryDeltaPct > 15
          ? "Overstock risk: carrying cost increases"
          : "Inventory in balanced range";
    return { revenue, expenses, net, margin, inventoryRisk };
  }, [baseline, params]);

  const reset = () =>
    setParams({ salesDeltaPct: 0, costDeltaPct: 0, inventoryDeltaPct: 0, priceDeltaPct: 0 });

  const presets = [
    { label: "Conservative", params: { salesDeltaPct: -10, costDeltaPct: 5, inventoryDeltaPct: -5, priceDeltaPct: 0 } },
    { label: "Aggressive Growth", params: { salesDeltaPct: 15, costDeltaPct: 8, inventoryDeltaPct: 10, priceDeltaPct: 3 } },
    { label: "Cost Squeeze", params: { salesDeltaPct: -5, costDeltaPct: -12, inventoryDeltaPct: -8, priceDeltaPct: 0 } },
    { label: "Price Hike", params: { salesDeltaPct: -3, costDeltaPct: 0, inventoryDeltaPct: 0, priceDeltaPct: 8 } },
  ] as const;

  return (
    <>
      <PageHeader
        title="What-If Simulation"
        subtitle="Power BI-style parameter simulation — BASELINE vs SCENARIO with transparent deltas. Simulated values are not actual business data."
        action={
          <div className="flex gap-2">
            <button
              onClick={reset}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-white hover:bg-slate-50"
            >
              Reset
            </button>
            <Badge variant="secondary" className="hidden sm:inline-flex">
              Read-only simulation
            </Badge>
          </div>
        }
      />

      {/* Presets */}
      <div className="flex flex-wrap gap-2 mb-4">
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() => setParams(p.params as WhatIfParams)}
            className="px-3 py-1.5 text-xs font-medium rounded-full border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Controls */}
        <Panel title="Parameters" subtitle="Drag sliders — scenario updates instantly" className="lg:col-span-1">
          <div className="space-y-6">
            <Slider
              label="Sales Volume Change"
              value={params.salesDeltaPct}
              min={-50}
              max={50}
              onChange={(v) => setParams((s) => ({ ...s, salesDeltaPct: v }))}
              hint="Affects revenue via volume. Combined with price change multiplicatively."
            />
            <Slider
              label="Price Change"
              value={params.priceDeltaPct}
              min={-20}
              max={20}
              onChange={(v) => setParams((s) => ({ ...s, priceDeltaPct: v }))}
              hint="Price elasticity assumed 1:1. Sales volume change still applies."
            />
            <Slider
              label="Expense Change"
              value={params.costDeltaPct}
              min={-50}
              max={50}
              onChange={(v) => setParams((s) => ({ ...s, costDeltaPct: v }))}
              hint="Directly scales total expenses."
            />
            <Slider
              label="Inventory Change"
              value={params.inventoryDeltaPct}
              min={-50}
              max={50}
              onChange={(v) => setParams((s) => ({ ...s, inventoryDeltaPct: v }))}
              hint="Does not affect P&L directly — shows operational risk."
            />
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              <p className="font-semibold">Methodology</p>
              <p className="mt-1">
                Baseline = sum of P&L rows in selected period ({pnl?.length ?? 0} months). Scenario revenue = baseline ×
                (1+price)×(1+sales) ; expenses = baseline × (1+cost). No forecast model is used — this is deterministic
                arithmetic for scenario planning.
              </p>
            </div>
          </div>
        </Panel>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MetricDelta label="Revenue" baseline={baseline.revenue} scenario={scenario.revenue} />
            <MetricDelta label="Expenses" baseline={baseline.expenses} scenario={scenario.expenses} />
            <MetricDelta label="Net Profit" baseline={baseline.net} scenario={scenario.net} />
            <MetricDelta
              label="Margin"
              baseline={Number(baseline.margin)}
              scenario={Number(scenario.margin)}
              format={(n) => `${n.toFixed(1)}%`}
            />
          </div>

          <Panel title="Scenario Summary" subtitle="Delta vs baseline with risk flag">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-border">
                <span className="text-ink-soft">Revenue delta</span>
                <span className={`font-bold ${scenario.revenue >= baseline.revenue ? "text-green-600" : "text-orange-600"}`}>
                  {npr(scenario.revenue - baseline.revenue)} ({baseline.revenue ? (((scenario.revenue - baseline.revenue) / baseline.revenue) * 100).toFixed(1) : "0"}%)
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-border">
                <span className="text-ink-soft">Profit delta</span>
                <span className={`font-bold ${scenario.net >= baseline.net ? "text-green-600" : "text-orange-600"}`}>
                  {npr(scenario.net - baseline.net)} ({baseline.net ? (((scenario.net - baseline.net) / Math.abs(baseline.net)) * 100).toFixed(1) : "0"}%)
                </span>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-xl bg-violet-50 border border-violet-200">
                <span className="mt-0.5 text-violet-600">▸</span>
                <div>
                  <p className="font-medium text-violet-900">Inventory signal</p>
                  <p className="text-violet-700">{scenario.inventoryRisk}</p>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold text-ink">Assumptions & Limitations</p>
                <ul className="mt-1 list-disc pl-4 text-xs text-ink-soft space-y-1">
                  <li>Linear scaling; no non-linear price elasticity or supplier constraints.</li>
                  <li>Inventory change shown as operational flag only — carrying cost not in P&L.</li>
                  <li>Data coverage: {coverage?.sales.row_count ?? "—"} sales rows behind this baseline.</li>
                  <li>Not a forecast — forecast intervals remain under /dashboard/analytics Forecast.</li>
                </ul>
              </div>
            </div>
          </Panel>

          <Panel title="Baseline Details" subtitle="Source of truth for simulation">
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
                        No P&L data for selected period — adjust date range.
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
