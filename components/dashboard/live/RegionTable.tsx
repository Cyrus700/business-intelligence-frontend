"use client";

import { nprCompact, useApi } from "@/lib/api";
import type { DimensionRow } from "@/lib/api";
import { apiParams, useFilters } from "@/lib/filters";
import { clsx } from "@/lib/cx";
import { EmptyState, PanelError, PanelSkeleton } from "./Status";

export default function RegionTable() {
  const { filters, addMultiDimension, removeMultiDimension } = useFilters();
  const { data, error, loading } = useApi<DimensionRow[]>(
    "/sales/by-region",
    apiParams(filters),
  );

  if (error) return <PanelError message={error} />;
  if (loading || !data) return <PanelSkeleton className="h-48" />;
  if (data.length === 0) return <EmptyState />;

  const max = Math.max(...data.map((r) => r.revenue), 1);
  const active = (filters.regions ?? [])[0];
  const toggle = (region: string) => {
    if ((filters.regions ?? []).includes(region)) {
      removeMultiDimension("regions", region);
    } else {
      addMultiDimension("regions", region);
    }
  };

  return (
    <ul className="space-y-3">
      {data.map((r) => (
        <li key={r.key} className="text-sm">
          <button
            onClick={() => toggle(r.key)}
            className={clsx(
              "group w-full text-left",
              active === r.key && active && (filters.regions ?? []).includes(r.key)
                ? "rounded-lg bg-primary/5 px-2 py-1"
                : "rounded-lg px-2 py-1 transition-colors hover:bg-bg-soft",
            )}
            aria-pressed={active === r.key}
          >
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
          </button>
        </li>
      ))}
      <li className="pt-1 text-xs text-ink-muted">
        Click a region to focus it; click again to clear.
      </li>
    </ul>
  );
}