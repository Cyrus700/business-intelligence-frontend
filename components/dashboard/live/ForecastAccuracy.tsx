"use client";

import { useApi } from "@/lib/api";
import { nprCompact } from "@/lib/api";
import { PanelSkeleton, PanelError } from "./Status";

type AccuracyRow = {
  target: string;
  model_type: string;
  version: number;
  trained_at: string;
  training_rows: number | null;
  metrics: {
    mape?: number;
    baseline_mape?: number;
    rmse?: number;
    mae?: number;
  } | null;
};

export default function ForecastAccuracy() {
  const { data, error, loading } = useApi<AccuracyRow[]>("/forecasts/accuracy");

  if (error) return <PanelError message={error} />;
  if (loading || !data) return <PanelSkeleton className="h-48" />;
  if (data.length === 0) {
    return <div className="py-6 text-center text-sm text-ink-muted">No models trained yet.</div>;
  }

  return (
    <div className="space-y-4">
      {data.map((model) => {
        const m = model.metrics ?? {};
        return (
          <div key={`${model.model_type}-${model.version}`} className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink capitalize">
                  {model.target.replace("_daily", "").replace("_", " ")}
                </p>
                <p className="text-xs text-ink-muted">
                  {model.model_type} v{model.version}
                  {model.training_rows != null && ` · ${model.training_rows} training rows`}
                </p>
              </div>
              {m.mape != null && (
                <div className="text-right">
                  <p className="text-lg font-semibold text-ink">{m.mape}%</p>
                  <p className="text-xs text-ink-muted">MAPE</p>
                </div>
              )}
            </div>

            {m.mape != null && (
              <div className="mt-3">
                <div className="flex h-2 overflow-hidden rounded-full bg-bg-soft">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(Math.max(100 - m.mape, 5), 100)}%`,
                      backgroundColor: m.mape < 15 ? "#10b981" : m.mape < 30 ? "#f59e0b" : "#ef4444",
                    }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-xs text-ink-muted">
                  <span>
                    {m.baseline_mape != null
                      ? `Baseline (naive): ${m.baseline_mape}% MAPE`
                      : ""}
                  </span>
                  <span>
                    {m.rmse != null && `RMSE: ${nprCompact(m.rmse)}`}
                  </span>
                </div>
              </div>
            )}

            <div className="mt-2 flex flex-wrap gap-3 text-xs text-ink-muted">
              {m.mae != null && <span>MAE: {nprCompact(m.mae)}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
