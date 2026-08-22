"use client";

import { useMemo, useState } from "react";
import { useApi, npr } from "@/lib/api";
import { apiParams, useFilters } from "@/lib/filters";
import type { Diagnosis, DiagnosisDimension, DiagnosisMember } from "@/lib/api";

const METRICS = [
  { id: "revenue", label: "Revenue" },
  { id: "orders", label: "Orders" },
  { id: "avg_order_value", label: "Avg order value" },
  { id: "expense_total", label: "Expenses" },
] as const;

type MetricId = (typeof METRICS)[number]["id"];

const DIMENSION_LABELS: Record<string, string> = {
  region: "Region",
  channel: "Channel",
  product: "Product",
  category: "Category",
};

function MemberRow({ m, maxAbs }: { m: DiagnosisMember; maxAbs: number }) {
  const pct = m.contribution_pct;
  const share = maxAbs > 0 ? (Math.abs(pct) / maxAbs) * 100 : 0;
  const positive = pct >= 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 truncate text-sm text-ink" title={m.key}>
        {m.key}
      </span>
      <div className="relative h-3 flex-1 rounded-full bg-bg-soft">
        <div
          className={`absolute top-0 h-3 rounded-full ${positive ? "bg-green-500" : "bg-red-400"}`}
          style={
            positive
              ? { left: "50%", width: `${share / 2}%` }
              : { right: "50%", width: `${share / 2}%` }
          }
        />
      </div>
      <span className="w-12 shrink-0 text-right text-xs text-ink-soft">
        {positive ? "+" : ""}
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

function DimensionBlock({ dim, d }: { dim: string; d: DiagnosisDimension }) {
  const maxAbs = Math.max(...d.members.map((m) => Math.abs(m.contribution_pct)), 0);
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-muted">
        {DIMENSION_LABELS[dim] ?? dim}
      </p>
      <div className="flex flex-col gap-1.5">
        {d.members.slice(0, 6).map((m) => (
          <MemberRow key={m.key} m={m} maxAbs={maxAbs} />
        ))}
      </div>
    </div>
  );
}

function useDiagnosis(metric: MetricId): {
  data: Diagnosis | null;
  error: string | null;
  loading: boolean;
} {
  const { filters } = useFilters();
  const params = apiParams(filters) as Record<string, string | undefined>;
  params.metric = metric;
  params.dimensions = "region,channel,product";
  const { data, error, loading } = useApi<Diagnosis>("/diagnostics/change", params);
  return { data, error: error ? String(error) : null, loading };
}

export default function DiagnosticsPanel() {
  const [metric, setMetric] = useState<MetricId>("revenue");
  const { data, error, loading } = useDiagnosis(metric);

  const dims = useMemo(
    () => (data ? Object.entries(data.dimensions) : []),
    [data],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {METRICS.map((m) => (
          <button
            key={m.id}
            onClick={() => setMetric(m.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              metric === m.id
                ? "bg-ink text-bg"
                : "bg-bg-soft text-ink-soft hover:bg-border"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {loading && <div className="h-24 animate-pulse rounded-xl bg-bg-soft" />}
      {error && <p className="text-sm text-warn">{error}</p>}

      {data && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold text-ink">{npr(data.current)}</span>
              <span className="text-sm text-ink-soft">vs {npr(data.previous)}</span>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                data.direction === "up" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              }`}
            >
              {data.delta >= 0 ? "+" : ""}
              {npr(data.delta)} ({data.change_pct !== null ? `${data.change_pct >= 0 ? "+" : ""}${data.change_pct}%` : "n/a"})
            </span>
          </div>

          {(data.summary.primary_factor || data.summary.secondary_factor) && (
            <div className="rounded-xl border border-border bg-bg-soft/50 p-3 text-sm text-ink">
              {data.summary.primary_factor && (
                <p>
                  <span className="font-semibold">Why:</span> {data.summary.primary_factor}
                  {data.summary.secondary_factor && (
                    <span className="text-ink-soft"> · also {data.summary.secondary_factor}</span>
                  )}
                </p>
              )}
            </div>
          )}

          {dims.length > 0 && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {dims.map(([dim, d]) => (
                <DimensionBlock key={dim} dim={dim} d={d} />
              ))}
            </div>
          )}

          <p className="text-xs text-ink-muted">
            Contribution share of each {DIMENSION_LABELS[dims[0]?.[0] ?? "member"] ?? "member"}&apos;s
            absolute change relative to the total change vs the preceding period.
          </p>
        </>
      )}
    </div>
  );
}