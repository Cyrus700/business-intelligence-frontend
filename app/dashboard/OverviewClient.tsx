"use client";

import PageHeader from "@/components/dashboard/PageHeader";
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
import { RangePicker } from "@/lib/filters";

export default function OverviewClient() {
  return (
    <>
      <PageHeader title="Overview" subtitle="" action={<RangePicker />} />
      <p className="-mt-4 mb-6 text-sm text-ink-soft">
        <Greeting />
      </p>

      <KpiRow />

      <RoleOverview>
        {(role) => (
          <>
            {role === "admin" && (
              <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-sm font-medium text-primary">
                  Admin view — you have full platform access.
                  <a href="/dashboard/users" className="ml-2 underline hover:no-underline">
                    Manage users
                  </a>
                  <span className="mx-2 text-primary/30">·</span>
                  <a href="/dashboard/permissions" className="underline hover:no-underline">
                    View permissions
                  </a>
                </p>
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Panel
                title="Revenue vs expenses"
                subtitle="Selected period"
                className="lg:col-span-2"
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
                  className="lg:col-span-2"
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
                className="lg:col-span-2"
                action={
                  <a href="/dashboard/analytics" className="text-sm font-medium text-primary">
                    Explore
                  </a>
                }
              >
                <TransactionsTable pageSize={6} />
              </Panel>

              <Panel
                title="Low stock"
                action={
                  <a href="/dashboard/alerts" className="text-sm font-medium text-primary">
                    View all
                  </a>
                }
              >
                <LowStock />
              </Panel>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Panel
                title="Anomaly alerts"
                subtitle="Live detection"
                className="lg:col-span-2"
                action={
                  role === "manager" || role === "admin" ? (
                    <a href="/dashboard/alerts" className="text-sm font-medium text-primary">
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
                    <a href="/dashboard/recommendations" className="text-sm font-medium text-primary">
                      View all
                    </a>
                  }
                >
                  <LiveRecommendations />
                </Panel>
              )}
            </div>

            {role === "admin" && (
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Panel
                  title="Platform admin"
                  subtitle="System overview"
                  className="lg:col-span-3"
                >
                  <div className="grid gap-4 sm:grid-cols-3">
                    <a
                      href="/dashboard/users"
                      className="rounded-xl border border-border p-4 text-center hover:bg-bg-soft"
                    >
                      <span className="text-2xl font-semibold text-ink">Users</span>
                      <p className="text-xs text-ink-muted">Manage accounts and roles</p>
                    </a>
                    <a
                      href="/dashboard/permissions"
                      className="rounded-xl border border-border p-4 text-center hover:bg-bg-soft"
                    >
                      <span className="text-2xl font-semibold text-ink">Roles</span>
                      <p className="text-xs text-ink-muted">View permission matrix</p>
                    </a>
                    <a
                      href="/dashboard/data"
                      className="rounded-xl border border-border p-4 text-center hover:bg-bg-soft"
                    >
                      <span className="text-2xl font-semibold text-ink">Data</span>
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
