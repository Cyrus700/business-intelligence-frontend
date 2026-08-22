"use client";

import PageHeader from "@/components/dashboard/PageHeader";
import Icon from "@/components/ui/Icon";
import Greeting from "@/components/dashboard/Greeting";
import Panel from "@/components/dashboard/Panel";
import AiInsights from "@/components/dashboard/AiInsights";
import LiveAnomalies from "@/components/dashboard/live/LiveAnomalies";
import LiveForecast from "@/components/dashboard/live/LiveForecast";
import KpiRow from "@/components/dashboard/live/KpiRow";
import RevenueExpenses from "@/components/dashboard/live/RevenueExpenses";
import ChannelDonut from "@/components/dashboard/live/ChannelDonut";
import TransactionsTable from "@/components/dashboard/live/TransactionsTable";
import LowStock from "@/components/dashboard/live/LowStock";
import LiveRecommendations from "@/components/dashboard/live/LiveRecommendations";
import RoleOverview from "@/components/dashboard/role/RoleOverview";
import DataFreshness from "@/components/dashboard/live/DataFreshness";
import { RangePicker } from "@/lib/filters";
import { useDashboardBase } from "@/lib/use-role";

export default function OverviewClient() {
  const base = useDashboardBase();
  return (
    <>
      <PageHeader title="Overview" subtitle="" action={<RangePicker />} />
      <p className="-mt-4 mb-4 text-sm text-ink-soft">
        <Greeting />
      </p>

      <DataFreshness className="mb-6" />

      <KpiRow />

      <RoleOverview>
        {(role) => (
          <>
            {role === "admin" && (
              <div className="mb-4 flex flex-wrap items-center gap-x-1 gap-y-1 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <Icon name="shield" className="mr-2 mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <p className="text-sm font-medium text-primary">
                  Admin view — you have full platform access.
                  <a href={`${base}/users`} className="ml-2 underline hover:no-underline">
                    Manage users
                  </a>
                  <span className="mx-2 text-primary/30">·</span>
                  <a href={`${base}/permissions`} className="underline hover:no-underline">
                    View permissions
                  </a>
                </p>
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Panel
                title="Revenue vs expenses"
                subtitle="Selected period"
                className="md:col-span-2 xl:col-span-2"
              >
                <RevenueExpenses />
              </Panel>

              <Panel title="Revenue by channel" subtitle="Selected period">
                <ChannelDonut />
              </Panel>

              {(role === "manager" || role === "admin") && (
                <Panel
                  title="Revenue forecast"
                  subtitle="30-day projection from the live model"
                  className="md:col-span-2 xl:col-span-2"
                >
                  <LiveForecast />
                </Panel>
              )}

              {(role === "manager" || role === "admin") ? (
                <Panel title="AI insights" subtitle="Live from the ML engine">
                  <AiInsights />
                </Panel>
              ) : (
                <Panel title="AI insights" subtitle="Upgrade to view">
                  <div className="flex flex-col items-center py-6 text-center">
                    <span className="text-3xl text-ink-muted">🔒</span>
                    <p className="mt-2 text-sm text-ink-soft">
                      Insights and forecasts are available to Managers and Admins.
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">
                      Contact your admin to upgrade your role.
                    </p>
                  </div>
                </Panel>
              )}

              <Panel
                title="Recent transactions"
                className="md:col-span-2 xl:col-span-2"
                action={
                  <a href={`${base}/analytics`} className="text-sm font-medium text-primary transition-colors hover:underline">
                    Explore
                  </a>
                }
              >
                <TransactionsTable pageSize={6} />
              </Panel>

              <Panel
                title="Low stock"
                action={
                  <a href={`${base}/alerts`} className="text-sm font-medium text-primary transition-colors hover:underline">
                    View all
                  </a>
                }
              >
                <LowStock />
              </Panel>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Panel
                title="Anomaly alerts"
                subtitle="Live detection"
                className="md:col-span-2 xl:col-span-2"
                action={
                  role === "manager" || role === "admin" ? (
                    <a href={`${base}/alerts`} className="text-sm font-medium text-primary transition-colors hover:underline">
                      Manage
                    </a>
                  ) : undefined
                }
              >
                <LiveAnomalies />
              </Panel>

              {(role === "manager" || role === "admin") && (
                <Panel
                  title="Recommendations"
                  subtitle="Automated suggestions"
                  action={
                    <a href={`${base}/recommendations`} className="text-sm font-medium text-primary transition-colors hover:underline">
                      View all
                    </a>
                  }
                >
                  <LiveRecommendations />
                </Panel>
              )}
            </div>

            {role === "admin" && (
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Panel
                  title="Platform admin"
                  subtitle="System overview"
                  className="md:col-span-2 xl:col-span-3"
                >
                  <div className="grid gap-4 sm:grid-cols-3">
                    <a
                      href={`${base}/users`}
                      className="group rounded-xl border border-border p-4 text-center transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift"
                    >
                      <span className="text-2xl font-semibold text-ink transition-colors group-hover:text-primary">Users</span>
                      <p className="text-xs text-ink-muted">Manage accounts and roles</p>
                    </a>
                    <a
                      href={`${base}/permissions`}
                      className="group rounded-xl border border-border p-4 text-center transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift"
                    >
                      <span className="text-2xl font-semibold text-ink transition-colors group-hover:text-primary">Roles</span>
                      <p className="text-xs text-ink-muted">View permission matrix</p>
                    </a>
                    <a
                      href={`${base}/data`}
                      className="group rounded-xl border border-border p-4 text-center transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift"
                    >
                      <span className="text-2xl font-semibold text-ink transition-colors group-hover:text-primary">Data</span>
                      <p className="text-xs text-ink-muted">Sources & ETL pipelines</p>
                    </a>
                  </div>
                </Panel>
              </div>
            )}
          </>
        )}
      </RoleOverview>
    </>
  );
}
