"use client";

import { nprCompact, useApi } from "@/lib/api";
import type { DimensionRow } from "@/lib/api";
import { apiParams, useFilters } from "@/lib/filters";
import { EmptyState, PanelError, PanelSkeleton } from "./Status";

export default function RegionTable() {
  const { filters } = useFilters();
  const { data, error, loading } = useApi<DimensionRow[]>(
    "/sales/by-region",
    apiParams(filters),
  );

  if (error) return <PanelError message={error} />;
  if (loading || !data) return <PanelSkeleton className="h-48" />;
  if (data.length === 0) return <EmptyState />;

  const max = Math.max(...data.map((r) => r.revenue), 1);
  return (
    <ul className="space-y-3">
      {data.map((r) => (
        <li key={r.key} className="text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium text-ink">{r.key}</span>
            <span className="font-mono text-ink-soft">{nprCompact(r.revenue)}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-bg-soft">
            <div
              className="h-1.5 rounded-full bg-primary"
              style={{ width: `${(r.revenue / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
