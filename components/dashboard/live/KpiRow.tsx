"use client";

import { npr, nprCompact, useApi } from "@/lib/api";
import type { KpiSummary, Timeseries } from "@/lib/api";
import { apiParams, useFilters } from "@/lib/filters";
import KpiCard from "../KpiCard";
import { PanelError, PanelSkeleton } from "./Status";

const CARDS: { metric: string; label: string; tone: string; money: boolean }[] = [
  { metric: "revenue", label: "Revenue", tone: "primary", money: true },
  { metric: "orders", label: "Orders", tone: "accent", money: false },
  { metric: "gross_margin", label: "Gross margin", tone: "ink", money: true },
  { metric: "expense_total", label: "Expenses", tone: "warn", money: true },
];

export default function KpiRow() {
  const { filters } = useFilters();
  const params = apiParams(filters);
  const summary = useApi<KpiSummary>("/kpis/summary", params);
  const revSeries = useApi<Timeseries>("/kpis/timeseries", { ...params, metric: "revenue" });
  const expSeries = useApi<Timeseries>("/kpis/timeseries", {
    ...params,
    metric: "expense_total",
  });

  if (summary.error) return <PanelError message={summary.error} />;
  if (summary.loading || !summary.data) return <PanelSkeleton className="h-36" />;

  const byMetric = Object.fromEntries(summary.data.cards.map((c) => [c.metric, c]));
  const sparks: Record<string, number[]> = {
    revenue: revSeries.data?.points.map((p) => p.value) ?? [],
    orders: [],
    gross_margin: revSeries.data?.points.map((p) => p.value) ?? [],
    expense_total: expSeries.data?.points.map((p) => p.value) ?? [],
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {CARDS.map(({ metric, label, tone, money }) => {
        const card = byMetric[metric];
        if (!card) return null;
        const value = money
          ? nprCompact(card.value)
          : new Intl.NumberFormat("en-IN").format(card.value);
        return (
          <div key={metric} title={money ? npr(card.value) : undefined}>
            <KpiCard
              label={label}
              value={value}
              delta={card.change_pct ?? 0}
              spark={sparks[metric] ?? []}
              tone={tone}
            />
          </div>
        );
      })}
    </div>
  );
}
