"use client";

// Advanced stochastic forecast for the main Analytics "Forecast" panel:
// Monte-Carlo p10/p50/p90 fan + per-model MAPE comparison, driven by the
// page's global cross-filters. Built on /advanced/forecast/scenarios and
// /advanced/models so the primary dashboard section is upgraded in place
// (no separate "lab" branding).

import { useState } from "react";
import { useFilters, apiParams } from "@/lib/filters";
import { useApi, npr } from "@/lib/api";
import ForecastChart from "@/components/dashboard/charts/ForecastChart";
import type { ForecastPoint } from "@/components/dashboard/charts/ForecastChart";
import { EmptyState, PanelError, PanelSkeleton } from "@/components/dashboard/live/Status";

type MetricKey = "revenue" | "orders" | "customers";
const METRICS: { key: MetricKey; label: string }[] = [
  { key: "revenue", label: "Revenue" },
  { key: "orders", label: "Orders" },
  { key: "customers", label: "Customers" },
];

type ScenarioOut = {
  metric: string;
  horizon: number;
  dates: string[];
  p10: number[];
  p50: number[];
  p90: number[];
  expected_total: number;
  expected_total_low: number;
  expected_total_high: number;
  n_paths: number;
};
type ModelsOut = { metric: string; horizon: number; metrics: Record<string, number | null>; best: string | null };

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function AdvancedForecast({ horizon = 30 }: { horizon?: number }) {
  const { filters } = useFilters();
  const [metric, setMetric] = useState<MetricKey>("revenue");

  const params = { ...apiParams(filters), metric, horizon };
  const fkey = ["advanced", "scenarios", metric, horizon, filters.from, filters.to, filters.regions, filters.channels, filters.categories];
  const scen = useApi<ScenarioOut>("/advanced/forecast/scenarios", params, fkey);
  const models = useApi<ModelsOut>("/advanced/models", { metric, horizon }, ["advanced", "models", metric, horizon]);

  const actuals = useApi<{ points: { period: string; value: number }[] }>(
    "/kpis/timeseries",
    { metric, from: isoDaysAgo(horizon + 34), to: isoDaysAgo(0) }
  );

  const loading = scen.loading || models.loading || actuals.loading;

  let data: ForecastPoint[] | null = null;
  if (scen.data && actuals.data) {
    const history: ForecastPoint[] = (actuals.data.points ?? []).map((p) => ({
      day: p.period.slice(5),
      actual: p.value,
      forecast: null,
      lo: null,
      hi: null,
    }));
    const future: ForecastPoint[] = scen.data.dates.map((d, i) => ({
      day: d.slice(5),
      actual: null,
      forecast: scen.data!.p50[i],
      lo: scen.data!.p10[i],
      hi: scen.data!.p90[i],
    }));
    if (history.length && future.length) {
      const last = history[history.length - 1];
      last.forecast = last.actual;
      last.lo = last.actual;
      last.hi = last.actual;
    }
    data = [...history, ...future];
  }

  const modelRows = models.data
    ? Object.entries(models.data.metrics).sort((a, b) => (a[1] ?? Infinity) - (b[1] ?? Infinity))
    : [];

  return (
    <div className="mt-6 border-t border-border pt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink">
          Advanced stochastic forecast
          <span className="ml-2 text-xs font-normal text-ink-muted">
            Monte-Carlo {scen.data?.n_paths ?? "—"} paths · p10–p90 band
          </span>
        </p>
        <div className="flex items-center gap-1 rounded-xl border border-border bg-bg-soft p-1">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                metric === m.key ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {scen.error ? (
        <PanelError message={scen.error} />
      ) : loading && !data ? (
        <PanelSkeleton className="h-[320px]" />
      ) : !data || data.length === 0 ? (
        <EmptyState label="No advanced forecast available" />
      ) : (
        <>
          <ForecastChart data={data} />
          {scen.data && (
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-border pt-3 text-xs text-ink-soft">
              <span>
                Expected total:{" "}
                <span className="font-medium text-ink">{npr(scen.data.expected_total)}</span>
              </span>
              <span>
                Range:{" "}
                <span className="font-medium text-ink">
                  {npr(scen.data.expected_total_low)} – {npr(scen.data.expected_total_high)}
                </span>
              </span>
              <span className="text-ink-muted">Shaded band = 10th–90th percentile</span>
            </div>
          )}
        </>
      )}

      {models.data && modelRows.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium text-ink-soft">Model comparison (MAPE, lower is better)</p>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead className="bg-bg-soft text-ink-muted">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Model</th>
                  <th className="px-3 py-2 text-right font-medium">MAPE</th>
                  <th className="px-3 py-2 text-center font-medium">Best</th>
                </tr>
              </thead>
              <tbody>
                {modelRows.map(([name, mape]) => (
                  <tr key={name} className="border-t border-border">
                    <td className="px-3 py-2 text-ink">{name}</td>
                    <td className="px-3 py-2 text-right font-medium text-ink">{mape != null ? `${mape.toFixed(2)}%` : "—"}</td>
                    <td className="px-3 py-2 text-center">
                      {models.data!.best === name ? (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">★</span>
                      ) : (
                        <span className="text-ink-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
