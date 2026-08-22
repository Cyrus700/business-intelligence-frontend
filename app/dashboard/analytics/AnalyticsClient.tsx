"use client";

import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import CategoryBar from "@/components/dashboard/live/CategoryBar";
import ChannelDonut from "@/components/dashboard/live/ChannelDonut";
import RevenueExpenses from "@/components/dashboard/live/RevenueExpenses";
import SalesExplorer from "@/components/dashboard/live/SalesExplorer";
import RegionTable from "@/components/dashboard/live/RegionTable";
import ForecastSection from "@/components/dashboard/live/ForecastSection";
import TrendsPanel from "@/components/dashboard/live/TrendsPanel";
import DiagnosticsPanel from "@/components/dashboard/live/DiagnosticsPanel";
import RoleAnalytics from "@/components/dashboard/role/RoleAnalytics";
import DataFreshness from "@/components/dashboard/live/DataFreshness";
import { RangePicker, apiParams, useFilters, MultiSelectFilter, FilterChipsBar, SavedViewsBar } from "@/lib/filters";
import { useApi, npr, type KpiSummaryExtended, type KpiCardExtended, type DimensionRow } from "@/lib/api";
import type { PnlRow } from "@/lib/api";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui";
import Badge from "@/components/ui/Badge";

function PnLSummary() {
  const { filters } = useFilters();
  const { data, error, loading } = useApi<PnlRow[]>("/finance/pnl", apiParams(filters));
  if (error) return <ErrorState message="Failed to load P&L" details={error} size="sm" />;
  if (loading) return <LoadingState message="Loading P&L…" size="md" />;
  if (!data || data.length === 0) return <EmptyState message="No P&L data" description="No data for selected period" size="sm" />;
  // /finance/pnl returns one row per calendar month within the selected range —
  // summing them (not just reading the last row) is what "Selected period"
  // actually means once the range spans more than one month (90D, 1Y).
  const revenue = data.reduce((s, r) => s + r.revenue, 0);
  const expenses = data.reduce((s, r) => s + r.expenses, 0);
  const net = data.reduce((s, r) => s + r.net, 0);
  const margin = revenue > 0 ? ((net / revenue) * 100).toFixed(1) : "0.0";
  return (
    <div className="flex flex-col gap-3 py-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink-soft">Revenue</span>
        <span className="font-semibold text-ink">{npr(revenue)}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink-soft">Expenses</span>
        <span className="font-semibold text-ink">{npr(expenses)}</span>
      </div>
      <div className="border-t border-border pt-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-ink">Net Profit</span>
          <span className={`font-semibold ${net >= 0 ? "text-green-600" : "text-warn"}`}>
            {npr(net)}
          </span>
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          Margin: {margin}%{data.length > 1 ? ` · ${data.length} months in range` : ""}
        </p>
      </div>
    </div>
  );
}

/** Region / channel / category multi-select filters backed by live dimension data. */
function DimensionFilters() {
  const { filters, addMultiDimension, removeMultiDimension, clearMultiDimension } = useFilters();
  const dimParams = { from: filters.from, to: filters.to };
  const regionsQ = useApi<DimensionRow[]>("/sales/by-region", dimParams, ["dim", "regions", filters.from, filters.to]);
  const channelsQ = useApi<DimensionRow[]>("/sales/by-channel", dimParams, ["dim", "channels", filters.from, filters.to]);
  const categoriesQ = useApi<DimensionRow[]>("/sales/by-category", dimParams, ["dim", "categories", filters.from, filters.to]);

  const available = {
    regions: (regionsQ.data ?? []).map((r) => r.key),
    channels: (channelsQ.data ?? []).map((r) => r.key),
    categories: (categoriesQ.data ?? []).map((r) => r.key),
  };
  const active = {
    regions: filters.regions ?? [],
    channels: filters.channels ?? [],
    categories: filters.categories ?? [],
  };

  return (
    <>
      <FilterChipsBar
        filters={filters}
        onRemoveRegion={(v) => removeMultiDimension("regions", v)}
        onRemoveChannel={(v) => removeMultiDimension("channels", v)}
        onRemoveCategory={(v) => removeMultiDimension("categories", v)}
        onClearAll={() => {
          clearMultiDimension("regions");
          clearMultiDimension("channels");
          clearMultiDimension("categories");
        }}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <MultiSelectFilter
          label="Regions"
          values={active.regions}
          available={available.regions}
          onAdd={(v) => addMultiDimension("regions", v)}
          onRemove={(v) => removeMultiDimension("regions", v)}
          onClear={() => clearMultiDimension("regions")}
        />
        <MultiSelectFilter
          label="Channels"
          values={active.channels}
          available={available.channels}
          onAdd={(v) => addMultiDimension("channels", v)}
          onRemove={(v) => removeMultiDimension("channels", v)}
          onClear={() => clearMultiDimension("channels")}
        />
        <MultiSelectFilter
          label="Categories"
          values={active.categories}
          available={available.categories}
          onAdd={(v) => addMultiDimension("categories", v)}
          onRemove={(v) => removeMultiDimension("categories", v)}
          onClear={() => clearMultiDimension("categories")}
        />
      </div>
    </>
  );
}

export default function AnalyticsClient() {
  const { data: kpiSummary } = useApi<KpiSummaryExtended>("/kpis/summary", undefined, ["kpis", "summary"]);

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="Deep-dive into sales, categories and regions."
        action={<RangePicker />}
      />

      <DataFreshness className="mb-6" />

      <SavedViewsBar className="mb-4" />

      <DimensionFilters />

      {/* KPI Cards with targets and status */}
      {kpiSummary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-6">
          {kpiSummary.cards.map((card: KpiCardExtended) => (
            <KpiCardExtended key={card.metric} card={card} />
          ))}
        </div>
      )}

      <RoleAnalytics>
        {(role) => (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Panel
              title="Trends"
              subtitle="Direction and reliability per KPI, 90-day window"
              className="md:col-span-2 xl:col-span-3"
            >
              <TrendsPanel />
            </Panel>

            <Panel title="Revenue by category" subtitle="Selected period" className="md:col-span-2 xl:col-span-2">
              <CategoryBar />
            </Panel>
            <Panel title="Revenue by channel" subtitle="Selected period">
              <ChannelDonut />
            </Panel>

            <Panel title="Revenue vs expenses" subtitle="Selected period" className="md:col-span-2 xl:col-span-2">
              <RevenueExpenses />
            </Panel>

            {(role === "manager" || role === "admin") ? (
              <Panel title="Profit & Loss" subtitle="Selected period">
                <PnLSummary />
              </Panel>
            ) : (
              <Panel title="Profit & Loss" subtitle="Upgrade to view">
                <div className="flex flex-col items-center py-6 text-center">
                  <span className="text-2xl text-ink-muted">🔒</span>
                  <p className="mt-2 text-sm text-ink-soft">
                    P&L statements are available to Managers and Admins.
                  </p>
                </div>
              </Panel>
            )}

            <Panel title="Revenue by region" subtitle="Selected period">
              <RegionTable />
            </Panel>

            <Panel
              title="What changed and why"
              subtitle="Contribution decomposition vs the preceding period"
              className="md:col-span-2 xl:col-span-3"
            >
              <DiagnosticsPanel />
            </Panel>

            {(role === "manager" || role === "admin") && (
              <Panel
                title="Forecast"
                subtitle="30-day projection with confidence band, and model accuracy vs baseline"
                className="md:col-span-2 xl:col-span-3"
              >
                <ForecastSection />
              </Panel>
            )}

            <Panel
              title="Sales explorer"
              subtitle="Products → transactions drill-down"
              className="md:col-span-2 xl:col-span-3"
            >
              <SalesExplorer />
            </Panel>
          </div>
        )}
      </RoleAnalytics>
    </>
  );
}

function KpiCardExtended({ card }: { card: KpiCardExtended }) {
  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    on_track: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
    near_target: { bg: "bg-warn-50", text: "text-warn", border: "border-warn-200" },
    off_target: { bg: "bg-destructive-50", text: "text-destructive", border: "border-destructive-200" },
  };
  const statusStyle = card.status ? statusColors[card.status] : { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" };
  const change = card.change_pct;
  const changeColor = change === null ? "text-slate-400" : change >= 0 ? "text-green-600" : "text-warn";

  return (
    <Panel className={`${statusStyle.border} border-l-4`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-ink">{card.label ?? card.metric}</p>
          <p className="mt-0.5 text-3xl font-bold text-ink">{npr(card.value)}</p>
          {card.target_value !== null && (
            <div className="mt-2 text-sm text-ink-soft">
              Target: {npr(card.target_value)} · Achievement: {card.achievement_pct !== null ? card.achievement_pct.toFixed(1) + "%" : "—"}
            </div>
          )}
        </div>
        {card.status && (
          <Badge variant={card.status === "on_track" ? "success" : card.status === "near_target" ? "warning" : "destructive"} className="text-xs">
            {card.status.replace("_", " ")}
          </Badge>
        )}
      </div>
      <div className="mt-3 flex items-center gap-4 text-sm">
        {change !== null && (
          <span className={`font-medium ${changeColor}`}>
            {change >= 0 ? "+" : ""}{change.toFixed(1)}%
          </span>
        )}
        {card.previous_value !== null && (
          <span className="text-ink-soft">vs {npr(card.previous_value)}</span>
        )}
        <span className={`text-xs font-medium ${statusStyle.text}`}>
          {card.status ? card.status.replace("_", " ") : "No target"}
        </span>
      </div>
    </Panel>
  );
}
