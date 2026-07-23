"use client";

import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import CategoryBar from "@/components/dashboard/live/CategoryBar";
import ChannelDonut from "@/components/dashboard/live/ChannelDonut";
import RevenueExpenses from "@/components/dashboard/live/RevenueExpenses";
import SalesExplorer from "@/components/dashboard/live/SalesExplorer";
import RegionTable from "@/components/dashboard/live/RegionTable";
import ForecastAccuracy from "@/components/dashboard/live/ForecastAccuracy";
import RoleAnalytics from "@/components/dashboard/role/RoleAnalytics";
import { RangePicker } from "@/lib/filters";
import { useApi, npr } from "@/lib/api";
import type { PnlRow } from "@/lib/api";

function PnLSummary() {
  const { data, error, loading } = useApi<PnlRow[]>("/finance/pnl");
  if (error) return <p className="text-sm text-warn">{error}</p>;
  if (loading) return <div className="h-24 animate-pulse rounded-xl bg-bg-soft" />;
  if (!data || data.length === 0) return <p className="text-sm text-ink-soft">No data for selected period</p>;
  const latest = data[data.length - 1];
  const margin = latest.revenue > 0 ? ((latest.net / latest.revenue) * 100).toFixed(1) : "0.0";
  return (
    <div className="flex flex-col gap-3 py-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink-soft">Revenue</span>
        <span className="font-semibold text-ink">{npr(latest.revenue)}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink-soft">Expenses</span>
        <span className="font-semibold text-ink">{npr(latest.expenses)}</span>
      </div>
      <div className="border-t border-border pt-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-ink">Net Profit</span>
          <span className="font-semibold text-green-600">{npr(latest.net)}</span>
        </div>
        <p className="mt-1 text-xs text-ink-muted">Margin: {margin}%</p>
      </div>
    </div>
  );
}

export default function AnalyticsClient() {
  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="Deep-dive into sales, categories and regions."
        action={<RangePicker />}
      />

      <RoleAnalytics>
        {(role) => (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Panel title="Revenue by category" subtitle="Selected period" className="lg:col-span-2">
              <CategoryBar />
            </Panel>
            <Panel title="Revenue by channel" subtitle="Selected period">
              <ChannelDonut />
            </Panel>

            <Panel title="Revenue vs expenses" subtitle="Selected period" className="lg:col-span-2">
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

            {(role === "manager" || role === "admin") && (
              <Panel
                title="Forecast Accuracy"
                subtitle="Live model performance vs baseline"
                className="lg:col-span-3"
              >
                <ForecastAccuracy />
              </Panel>
            )}

            <Panel
              title="Sales explorer"
              subtitle="Products → transactions drill-down"
              className="lg:col-span-3"
            >
              <SalesExplorer />
            </Panel>
          </div>
        )}
      </RoleAnalytics>
    </>
  );
}
