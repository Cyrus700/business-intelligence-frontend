"use client";

// Live anomaly feed from the detection engine. `manage` adds acknowledge /
// dismiss actions (manager+ role — the API enforces it).

import { useState } from "react";
import { apiGet, npr, useApi } from "@/lib/api";
import { clsx } from "@/lib/cx";
import { EmptyState, PanelError, PanelSkeleton } from "./Status";

type Anomaly = {
  id: string;
  detected_at: string;
  metric: string;
  observed_value: string;
  expected_value: string | null;
  severity: "high" | "medium" | "low";
  status: "open" | "acknowledged" | "dismissed";
  context: {
    date?: string;
    direction?: string;
    pct_deviation?: number | null;
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

async function patchAnomaly(id: string, status: string) {
  const token = (await import("@/lib/api")).getToken();
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
  const res = await fetch(`${base}/anomalies/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error((await res.json()).detail ?? "Update failed");
}

export default function LiveAnomalies({
  manage = false,
  limit = 6,
}: {
  manage?: boolean;
  limit?: number;
}) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const { data, error, loading } = useApi<Anomaly[]>("/anomalies", {
    status: manage ? undefined : "open",
    page_size: 50,
    _r: refreshKey, // cache-buster: refetch after ack/dismiss
  });

  if (error) return <PanelError message={error} />;
  if (loading || !data) return <PanelSkeleton className="h-48" />;
  const items = data.slice(0, limit);
  if (items.length === 0) return <EmptyState label="No anomalies detected 🎉" />;

  const act = (id: string, status: string) => {
    setActionError(null);
    patchAnomaly(id, status)
      .then(() => setRefreshKey((k) => k + 1))
      .catch((e: unknown) =>
        setActionError(e instanceof Error ? e.message : "Update failed"),
      );
  };

  return (
    <div>
      {actionError && <p className="mb-2 text-xs text-warn">{actionError}</p>}
      <ul className="space-y-1">
        {items.map((a) => {
          const sev = SEV[a.severity] ?? SEV.low;
          const pct = a.context?.pct_deviation;
          const direction = a.context?.direction === "below" ? "−" : "+";
          return (
            <li
              key={a.id}
              className="flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-bg-soft"
            >
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
                <span className="flex shrink-0 gap-1">
                  <button
                    onClick={() => act(a.id, "acknowledged")}
                    className="rounded-lg border border-border px-2 py-1 text-xs text-ink-soft hover:bg-bg-soft"
                  >
                    Ack
                  </button>
                  <button
                    onClick={() => act(a.id, "dismissed")}
                    className="rounded-lg border border-border px-2 py-1 text-xs text-ink-muted hover:bg-bg-soft"
                  >
                    Dismiss
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
