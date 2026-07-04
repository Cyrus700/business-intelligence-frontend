"use client";

// Live revenue forecast: recent actuals + model forecast with confidence band,
// plus the accuracy transparency card (R5 — trust in AI output).

import { useApi } from "@/lib/api";
import ForecastChart from "../charts/ForecastChart";
import type { ForecastPoint } from "../charts/ForecastChart";
import { EmptyState, PanelError, PanelSkeleton } from "./Status";

type ApiForecast = {
  target: string;
  model_type: string;
  model_version: number;
  metrics: {
    mape?: number;
    baseline_mape?: number;
    mae?: number;
    holdout_days?: number;
  } | null;
  points: {
    forecast_date: string;
    yhat: number;
    yhat_lower: number | null;
    yhat_upper: number | null;
  }[];
};
type Timeseries = { points: { period: string; value: number }[] };

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function LiveForecast({ horizon = 30 }: { horizon?: number }) {
  const forecast = useApi<ApiForecast>("/forecasts", { target: "revenue_daily", horizon });
  const actuals = useApi<Timeseries>("/kpis/timeseries", {
    metric: "revenue",
    from: isoDaysAgo(horizon + 34),
    to: isoDaysAgo(0),
  });

  if (forecast.error) return <PanelError message={forecast.error} />;
  if (forecast.loading || !forecast.data || actuals.loading)
    return <PanelSkeleton className="h-[320px]" />;
  if (forecast.data.points.length === 0) return <EmptyState label="No forecast yet — retrain" />;

  const history: ForecastPoint[] = (actuals.data?.points ?? []).map((p) => ({
    day: p.period.slice(5),
    actual: p.value,
    forecast: null,
    lo: null,
    hi: null,
  }));
  const future: ForecastPoint[] = forecast.data.points.map((p) => ({
    day: p.forecast_date.slice(5),
    actual: null,
    forecast: p.yhat,
    lo: p.yhat_lower,
    hi: p.yhat_upper,
  }));
  // bridge the lines at the seam
  if (history.length && future.length) {
    const last = history[history.length - 1];
    last.forecast = last.actual;
    last.lo = last.actual;
    last.hi = last.actual;
  }

  const m = forecast.data.metrics ?? {};
  return (
    <div>
      <ForecastChart data={[...history, ...future]} />
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-border pt-3 text-xs text-ink-soft">
        <span>
          Model: <span className="font-medium text-ink">{forecast.data.model_type} v{forecast.data.model_version}</span>
        </span>
        {m.mape !== undefined && (
          <span>
            Accuracy (MAPE, {m.holdout_days ?? 90}d holdout):{" "}
            <span className="font-medium text-accent">{m.mape}%</span>
            {m.baseline_mape != null && (
              <>
                {" "}vs naive <span className="font-medium text-ink">{m.baseline_mape}%</span>
              </>
            )}
          </span>
        )}
        <span className="text-ink-muted">Shaded band = 90% confidence interval</span>
      </div>
    </div>
  );
}
