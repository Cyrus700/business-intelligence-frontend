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
import DataFreshness, { useDataCoverage } from "@/components/dashboard/live/DataFreshness";
import { RangePicker } from "@/lib/filters";
import { useDashboardBase } from "@/lib/use-role";
import { useAuth } from "@/lib/auth-context";
import { useOrganizations } from "@/lib/api";

function BusinessEmptyState() {
  const base = useDashboardBase();
  // Reuses DataFreshness's coverage query instead of holding a second key for
  // the same endpoint — one `/data-coverage` request serves both.
  const { data: coverage } = useDataCoverage();
  const hasData =
    (coverage?.sales?.row_count ?? 0) > 0 || (coverage?.expenses?.row_count ?? 0) > 0;
  if (hasData || !coverage) return null;
  return (
    <div className="mb-6 rounded-xl border border-border bg-white p-4">
      <h3 className="text-sm font-medium text-ink">No data yet</h3>
      <p className="mt-1 text-sm text-ink-soft">Upload a CSV to see your dashboard.</p>
      <a href={`${base}/data`} className="mt-3 inline-flex rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white">Upload data</a>
    </div>
  );
}

export default function OverviewClient() {
  const base = useDashboardBase();
  const { user } = useAuth();
  const { data: orgs } = useOrganizations(!!user);
  const businessName = orgs?.[0]?.name ?? null;
  const isSuper = !!user?.is_super_admin;
  const roleLabel = user?.role === "admin" ? (isSuper ? "Platform Super-Admin" : "Business Admin") : user?.role === "manager" ? "Manager" : "Analyst";
  return (
    <>
      <PageHeader
        title={businessName ?? "Overview"}
        subtitle={businessName ? `${businessName}` : "Overview"}
        action={<RangePicker />}
      />
      <p className="-mt-2 mb-4 text-sm text-ink-soft">
        <Greeting />
      </p>

      <DataFreshness className="mb-6" />

      {/* Onboarding for brand-new business with no data */}
      <BusinessEmptyState />

      <KpiRow />

      <RoleOverview>
        {(role) => (
          <>

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
