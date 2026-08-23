"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getMlModels,
  getBacktest,
  type MlModelOut,
  type BacktestOut,
  type BacktestModel,
} from "@/lib/api";
import { nprCompact } from "@/lib/api";
import Panel from "@/components/dashboard/Panel";
import PageHeader from "@/components/dashboard/PageHeader";
import Badge from "@/components/ui/Badge";
import PredictiveLab from "@/components/dashboard/advanced/PredictiveLab";

export default function MlMonitoringClient() {
  const [models, setModels] = useState<MlModelOut[]>([]);
  const [backtest, setBacktest] = useState<BacktestOut | null>(null);
  const [loadingModels, setLoadingModels] = useState(true);
  const [loadingBacktest, setLoadingBacktest] = useState(true);
  const [errorModels, setErrorModels] = useState<string | null>(null);
  const [errorBacktest, setErrorBacktest] = useState<string | null>(null);
  const [horizon, setHorizon] = useState(7);
  const [steps, setSteps] = useState(3);

  useEffect(() => {
    let mounted = true;
    getMlModels()
      .then((data) => mounted && setModels(data))
      .catch((e) => mounted && setErrorModels(e.message))
      .finally(() => mounted && setLoadingModels(false));
    getBacktest({ horizon, steps })
      .then((data) => mounted && setBacktest(data))
      .catch((e) => mounted && setErrorBacktest(e.message))
      .finally(() => mounted && setLoadingBacktest(false));
    return () => { mounted = false; };
  }, [horizon, steps]);

  const formatDate = (iso: string | null) => iso ? new Date(iso).toLocaleString() : "—";
  const statusBadge = (active: boolean) =>
    active ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Retired</Badge>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="ML Model Monitoring"
        subtitle="Model registry, rolling-origin backtest, and drift indicators."
      />

      {/* Model Registry */}
      <Panel title="Model Registry" subtitle={`${models.length} model(s) tracked`}>
        {loadingModels ? (
          <div className="text-center py-8 text-slate-500">Loading models…</div>
        ) : errorModels ? (
          <div className="text-center py-8 text-red-500">Error: {errorModels}</div>
        ) : models.length === 0 ? (
          <div className="text-center py-8 text-slate-500">No models trained yet. Use the retrain endpoint.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
<caption className="sr-only">Model registry</caption>
<caption className="sr-only">Model registry</caption>
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-2 pr-4" scope="col">Model</th>
                  <th className="pb-2 pr-4" scope="col">Target</th>
                  <th className="pb-2 pr-4" scope="col">Dimensions</th>
                  <th className="pb-2 pr-4" scope="col">Version</th>
                  <th className="pb-2 pr-4" scope="col">Status</th>
                  <th className="pb-2 pr-4" scope="col">MAPE</th>
                  <th className="pb-2 pr-4" scope="col">Trained</th>
                  <th className="pb-2 pr-4" scope="col">Activated</th>
                  <th className="pb-2 pr-4" scope="col">Retired</th>
                  <th className="pb-2 pr-4" scope="col">Dataset Range</th>
                  <th className="pb-2 pr-4" scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 pr-4 font-mono text-slate-700">{m.model_type}</td>
                    <td className="py-2 pr-4">{m.target}</td>
                    <td className="py-2 pr-4">
                      {Object.keys(m.dimensions).length === 0 ? (
                        <span className="text-slate-400">(global)</span>
                      ) : (
                        <span className="font-mono text-xs">{JSON.stringify(m.dimensions)}</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">v{m.version}</td>
                    <td className="py-2 pr-4">{statusBadge(m.is_active)}</td>
                    <td className="py-2 pr-4">
                      {m.metrics && typeof m.metrics.mape === "number" ? (
                        <span className={m.metrics.mape < 15 ? "text-green-600" : m.metrics.mape < 30 ? "text-amber-600" : "text-red-600"}>
                          {m.metrics.mape.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-slate-600">{formatDate(m.trained_at)}</td>
                    <td className="py-2 pr-4 text-slate-600">{formatDate(m.activated_at)}</td>
                    <td className="py-2 pr-4 text-slate-600">{formatDate(m.retired_at)}</td>
                    <td className="py-2 pr-4 text-slate-600">
                      {m.dataset_start && m.dataset_end ? (
                        `${m.dataset_start} → ${m.dataset_end}`
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {!m.is_active && m.retired_at ? null : (
                        <button
                          onClick={() => {
                            if (confirm(`Retire model ${m.model_type} v${m.version} (${m.target})?`)) {
                              retireModel(m.id);
                            }
                          }}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Retire
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Rolling-Origin Backtest */}
      <Panel title="Rolling-Origin Backtest" subtitle="Walk-forward MAPE comparison across candidates">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <label htmlFor="backtest-horizon" className="text-sm text-slate-600">Horizon (days)</label>
          <select
            id="backtest-horizon"
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
            className="border border-slate-300 rounded px-2 py-1 text-sm"
          >
            {[3, 5, 7, 14, 30].map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
          <label htmlFor="backtest-steps" className="text-sm text-slate-600">Steps</label>
          <select
            id="backtest-steps"
            value={steps}
            onChange={(e) => setSteps(Number(e.target.value))}
            className="border border-slate-300 rounded px-2 py-1 text-sm"
          >
            {[2, 3, 4, 5, 6].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            onClick={() => {
              setLoadingBacktest(true);
              setErrorBacktest(null);
              getBacktest({ horizon, steps })
                .then((d) => { setBacktest(d); setLoadingBacktest(false); })
                .catch((e) => { setErrorBacktest(e.message); setLoadingBacktest(false); });
            }}
            disabled={loadingBacktest}
            className="px-3 py-1 text-sm bg-slate-900 text-white rounded hover:bg-slate-700 disabled:opacity-50"
          >
            {loadingBacktest ? "Running…" : "Run Backtest"}
          </button>
        </div>

        {loadingBacktest && !backtest ? (
          <div className="text-center py-8 text-slate-500">Running backtest…</div>
        ) : errorBacktest ? (
          <div className="text-center py-8 text-red-500">Error: {errorBacktest}</div>
        ) : backtest ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-2 pr-4" scope="col">Model</th>
                  <th className="pb-2 pr-4" scope="col">Avg MAPE</th>
                  <th className="pb-2 pr-4" scope="col">Worst MAPE</th>
                  <th className="pb-2 pr-4" scope="col">Steps OK</th>
                  <th className="pb-2 pr-4" scope="col">Failures</th>
                  <th className="pb-2 pr-4" scope="col">Step Detail (MAPE%)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(backtest.models).map(([model, data]: [string, BacktestModel]) => (
                  <tr key={model} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 pr-4 font-mono text-slate-700">{model}</td>
                    <td className="py-2 pr-4">
                      <span className={data.mape_avg < 15 ? "text-green-600" : data.mape_avg < 30 ? "text-amber-600" : "text-red-600"}>
                        {data.mape_avg.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <span className={data.mape_worst < 15 ? "text-green-600" : data.mape_worst < 30 ? "text-amber-600" : "text-red-600"}>
                        {data.mape_worst.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2 pr-4">{data.steps_ok}</td>
                    <td className="py-2 pr-4">{data.failures}</td>
                    <td className="py-2 pr-4 font-mono text-xs">
                      {data.steps.map((s) => `${s.step}:${s.mape.toFixed(1)}%`).join(" | ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-slate-500">
              Horizon: {backtest.horizon}d · Steps: {backtest.steps} · Each step trains on a growing window and predicts the next {backtest.horizon} days.
            </p>
          </div>
        ) : (
          <button
            onClick={() => {
              setLoadingBacktest(true);
              setErrorBacktest(null);
              getBacktest({ horizon, steps })
                .then((d) => { setBacktest(d); setLoadingBacktest(false); })
                .catch((e) => { setErrorBacktest(e.message); setLoadingBacktest(false); });
            }}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
          >
            Run Initial Backtest
          </button>
        )}
      </Panel>
      <PredictiveLab />
    </div>
  );

  function retireModel(modelId: string) {
    fetch(`/api/v1/ml/models/${modelId}/retire`, { method: "POST", credentials: "include" })
      .then((r) => r.json())
      .then(() => {
        setModels((prev) => prev.map((m) => (m.id === modelId ? { ...m, is_active: false, retired_at: new Date().toISOString() } : m)));
      })
      .catch((e) => alert("Failed to retire: " + e.message));
  }
}