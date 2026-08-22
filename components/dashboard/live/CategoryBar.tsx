"use client";

import { useApi } from "@/lib/api";
import type { DimensionRow } from "@/lib/api";
import { apiParams, useFilters } from "@/lib/filters";
import BarCategory from "../charts/BarCategory";
import { EmptyState, PanelError, PanelSkeleton } from "./Status";

export default function CategoryBar() {
  const { filters, addMultiDimension, removeMultiDimension } = useFilters();
  const { data, error, loading } = useApi<DimensionRow[]>(
    "/sales/by-category",
    apiParams(filters),
  );

  if (error) return <PanelError message={error} />;
  if (loading || !data) return <PanelSkeleton className="h-[280px]" />;
  if (data.length === 0) return <EmptyState />;

  const active = (filters.categories ?? [])[0];
  const toggle = (category: string) => {
    if ((filters.categories ?? []).includes(category)) {
      removeMultiDimension("categories", category);
    } else {
      addMultiDimension("categories", category);
    }
  };

  return (
    <div>
      <BarCategory
        data={data.map((r) => ({ category: r.key, value: r.revenue }))}
        onBarClick={toggle}
        activeCategory={active}
      />
      {active && (
        <p className="mt-2 text-xs text-ink-muted">
          Viewing <span className="font-medium text-ink">{active}</span>. Click a bar to clear.
        </p>
      )}
    </div>
  );
}