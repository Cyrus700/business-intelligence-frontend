"use client";

import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { nprCompact } from "@/lib/api";
import { usePbFilters } from "./PbFilterContext";
import Panel, { Loading, Empty } from "./Panel";
import { useForecastScenarios, useModelComparison } from "@/lib/advanced";

type Sc = {
  model: string;
  horizon: number;
  residual_std: number;
  dates: string[];
  point: number[];
  p10: number[];
  p50: number[];
  p90: number[];
  scenarios: { pessimistic: number[]; base: number[]; optimistic: number[] };
  final: { point: number; expected_total: number; p10_total: number; p90_total: number };
};
type Mc = { metric: string; candidates: { model: string; mape: number }[]; best: string };

export default function ForecastScenarios({
  metric,
  horizon,
  nPaths,
}: {
  metric: string;
  horizon: number;
  nPaths: number;
}) {
  const f = usePbFilters();
  const { data: scData, loading } = useForecastScenarios(f, metric, horizon, nPaths);
  const { data: mcData } = useModelComparison(f, metric);
  const sc = scData as Sc | null;
  const mc = mcData as Mc | null;
  if (loading) return <Panel title="Probabilistic Forecast"><Loading /></Panel>;
  if (!sc || sc.dates?.length === 0) return <Panel title="Probabilistic Forecast"><Empty label="Need more history" /></Panel>;

  const chart = sc.dates.map((d, i) => ({
    date: d.slice(5),
    point: sc.point[i],
    p10: sc.p10[i],
    p90: sc.p90[i],
    base: sc.scenarios.base[i],
    optimistic: sc.scenarios.optimistic[i],
    pessimistic: sc.scenarios.pessimistic[i],
  }));

  return (
    <Panel
      title="Probabilistic Forecast (Monte Carlo)"
      subtitle={`${metric} · ${sc.model} · ${nPaths} paths · residual σ=${sc.residual_std}`}
    >
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Expected total" value={nprCompact(sc.final.expected_total)} />
        <Stat label="P10 total" value={nprCompact(sc.final.p10_total)} tone="down" />
        <Stat label="P90 total" value={nprCompact(sc.final.p90_total)} tone="up" />
        <Stat label="Point (end)" value={nprCompact(sc.final.point)} />
      </div>
      {mc?.candidates?.length ? (
        <div className="mb-3 flex flex-wrap gap-2 text-xs">
          {mc.candidates.map((c) => (
            <span key={c.model} className={`rounded-full px-2 py-0.5 ${c.model === mc.best ? "bg-primary/10 font-semibold text-primary" : "bg-slate-100 text-ink-muted"}`}>
              {c.model}: MAPE {c.mape}%
            </span>
          ))}
          <span className="text-ink-muted">best: {mc.best}</span>
        </div>
      ) : null}
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={chart}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={24} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => nprCompact(Number(v))} />
          <Tooltip formatter={(v: any) => nprCompact(Number(v))} />
          <Legend />
          <Area dataKey="p90" name="P90" stroke="none" fill="#a5b4fc" fillOpacity={0.35} />
          <Area dataKey="p10" name="P10" stroke="none" fill="#ffffff" fillOpacity={1} />
          <Line dataKey="base" name="base" stroke="#4f46e5" dot={false} />
          <Line dataKey="optimistic" name="optimistic" stroke="#10b981" strokeDasharray="4 3" dot={false} />
          <Line dataKey="pessimistic" name="pessimistic" stroke="#ef4444" strokeDasharray="4 3" dot={false} />
          <Line dataKey="point" name="point" stroke="#0f172a" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </Panel>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  const c = tone === "up" ? "text-emerald-600" : tone === "down" ? "text-red-600" : "text-ink";
  return (
    <div className="rounded-lg border border-slate-200 p-2">
      <div className="text-xs text-ink-muted">{label}</div>
      <div className={`font-mono text-sm font-semibold ${c}`}>{value}</div>
    </div>
  );
}
