"use client";

import { useApi } from "@/lib/api";
import type { DimensionRow } from "@/lib/api";
import { apiParams, useFilters } from "@/lib/filters";
import BarCategory from "../charts/BarCategory";
import { EmptyState, PanelError, PanelSkeleton } from "./Status";

export default function CategoryBar() {
  const { filters } = useFilters();
  const { data, error, loading } = useApi<DimensionRow[]>(
    "/sales/by-category",
    apiParams(filters),
  );

  if (error) return <PanelError message={error} />;
  if (loading || !data) return <PanelSkeleton className="h-[280px]" />;
  if (data.length === 0) return <EmptyState />;

  return <BarCategory data={data.map((r) => ({ category: r.key, value: r.revenue }))} />;
}
