"use client";

import { useApi } from "@/lib/api";
import type { Timeseries } from "@/lib/api";
import { apiParams, useFilters } from "@/lib/filters";
import AreaRevenue from "../charts/AreaRevenue";
import type { RevenuePoint } from "../charts/AreaRevenue";
import { EmptyState, PanelError, PanelSkeleton } from "./Status";

export default function RevenueExpenses() {
  const { filters } = useFilters();
  const params = apiParams(filters);
  const granularity = filters.range === "12m" ? "week" : "day";
  const revenue = useApi<Timeseries>("/kpis/timeseries", {
    ...params,
    metric: "revenue",
    granularity,
  });
  const expenses = useApi<Timeseries>("/kpis/timeseries", {
    ...params,
    metric: "expense_total",
    granularity,
  });

  if (revenue.error) return <PanelError message={revenue.error} />;
  if (revenue.loading || !revenue.data) return <PanelSkeleton className="h-[300px]" />;
  if (revenue.data.points.length === 0) return <EmptyState />;

  const expenseByPeriod = new Map(
    (expenses.data?.points ?? []).map((p) => [p.period, p.value]),
  );
  const data: RevenuePoint[] = revenue.data.points.map((p) => ({
    period: p.period.slice(5), // MM-DD
    revenue: p.value,
    expenses: expenseByPeriod.get(p.period) ?? null,
  }));
  return <AreaRevenue data={data} />;
}
