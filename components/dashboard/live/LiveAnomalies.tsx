"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPatch, npr, queryKeys, useApi } from "@/lib/api";
import { clsx } from "@/lib/cx";
import { EmptyState, PanelError, PanelSkeleton } from "./Status";

type Anomaly = {
  id: string;
  detected_at: string;
  metric: string;
  observed_value: string;
  expected_value: string | null;
  deviation_score: string | null;
  severity: "high" | "medium" | "low";
  status: "open" | "acknowledged" | "dismissed";
  context: {
    date?: string;
    direction?: string;
    pct_deviation?: number | null;
    methods?: {
      robust_zscore?: number;
      isolation_forest?: number;
    };
  } | null;
};

const SEV: Record<string, { dot: string; label: string }> = {
  high: { dot: "bg-warn", label: "High" },
  medium: { dot: "bg-primary", label: "Medium" },
  low: { dot: "bg-ink-muted", label: "Low" },
};

const METRIC_LABEL: Record<string, string> = {
  revenue: "Revenue",
  expense_total: "Expenses",
};

export default function LiveAnomalies({
  manage = false,
  limit = 6,
}: {
  manage?: boolean;
  limit?: number;
}) {
  const queryClient = useQueryClient();
  const params = { status: manage ? undefined : "open", page_size: 50 };

  const { data, error, loading } = useApi<Anomaly[]>("/anomalies", params);

  const patchMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiPatch(`/anomalies/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.anomalies.all });
    },
  });

  if (error) return <PanelError message={error} />;
  if (loading || !data) return <PanelSkeleton className="h-48" />;
  const items = data.slice(0, limit);
  if (items.length === 0) return <EmptyState label="No anomalies detected 🎉" />;

  return (
    <div>
      {patchMutation.isError && (
        <p className="mb-2 text-xs text-warn">
          {patchMutation.error instanceof Error ? patchMutation.error.message : "Update failed"}
        </p>
      )}
      <ul className="space-y-1">
        {items.map((a) => {
          const sev = SEV[a.severity] ?? SEV.low;
          const pct = a.context?.pct_deviation;
          const direction = a.context?.direction === "below" ? "−" : "+";
          return (
            <li
              key={a.id}
              className="rounded-xl px-2 py-3 transition-colors hover:bg-bg-soft"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  {a.status === "open" && (
                    <span
                      className={clsx(
                        "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
                        sev.dot,
                      )}
                    />
                  )}
                  <span className={clsx("relative inline-flex h-2.5 w-2.5 rounded-full", sev.dot)} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {METRIC_LABEL[a.metric] ?? a.metric} {a.context?.direction ?? "deviation"}{" "}
                    expected — {a.context?.date}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {sev.label} · observed {npr(Number(a.observed_value))}
                    {a.expected_value != null && <> vs expected {npr(Number(a.expected_value))}</>}
                    {a.status !== "open" && <> · {a.status}</>}
                  </p>
                </div>
                {pct != null && (
                  <span
                    className={clsx(
                      "font-mono text-sm font-semibold",
                      a.context?.direction === "below" ? "text-primary" : "text-warn",
                    )}
                  >
                    {direction}
                    {Math.abs(pct)}%
                  </span>
                )}
                {manage && a.status === "open" && (
                  <span className="ml-auto flex shrink-0 gap-1">
                    <button
                      onClick={() => patchMutation.mutate({ id: a.id, status: "acknowledged" })}
                      disabled={patchMutation.isPending}
                      className="rounded-lg border border-border px-2 py-1 text-xs text-ink-soft hover:bg-bg-soft disabled:opacity-50"
                    >
                      Ack
                    </button>
                    <button
                      onClick={() => patchMutation.mutate({ id: a.id, status: "dismissed" })}
                      disabled={patchMutation.isPending}
                      className="rounded-lg border border-border px-2 py-1 text-xs text-ink-muted hover:bg-bg-soft disabled:opacity-50"
                    >
                      Dismiss
                    </button>
                  </span>
                )}
              </div>
              {a.severity === "high" && a.expected_value != null && (
                <div className="mt-1.5 ml-5 flex flex-wrap gap-3 text-xs text-ink-muted">
                  {a.context?.methods && (
                    <>
                      {a.context.methods.robust_zscore != null && (
                        <span>z-score: {a.context.methods.robust_zscore.toFixed(1)}</span>
                      )}
                      {a.context.methods.isolation_forest != null && (
                        <span>IF score: {a.context.methods.isolation_forest.toFixed(3)}</span>
                      )}
                    </>
                  )}
                  {(() => {
                    const impact = Math.abs(Number(a.observed_value) - Number(a.expected_value));
                    return impact > 0 ? (
                      <span>Impact: {npr(impact)}</span>
                    ) : null;
                  })()}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
