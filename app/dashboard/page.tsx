import type { Metadata } from "next";
import PageHeader from "@/components/dashboard/PageHeader";
import Greeting from "@/components/dashboard/Greeting";
import KpiCard from "@/components/dashboard/KpiCard";
import Panel from "@/components/dashboard/Panel";
import AiInsights from "@/components/dashboard/AiInsights";
import AnomalyFeed from "@/components/dashboard/AnomalyFeed";
import ActivityTable from "@/components/dashboard/ActivityTable";
import AreaRevenue from "@/components/dashboard/charts/AreaRevenue";
import DonutSources from "@/components/dashboard/charts/DonutSources";
import ForecastChart from "@/components/dashboard/charts/ForecastChart";
import { KPIS } from "@/lib/dashboard-data";

export const metadata: Metadata = { title: "Overview · Insightful" };

function RangePicker() {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-white p-1 text-sm">
      {["7d", "30d", "12m"].map((r, i) => (
        <button
          key={r}
          className={
            i === 1
              ? "rounded-lg bg-primary px-3 py-1.5 font-medium text-white"
              : "rounded-lg px-3 py-1.5 text-ink-soft hover:bg-bg-soft"
          }
        >
          {r}
        </button>
      ))}
    </div>
  );
}

export default function OverviewPage() {
  return (
    <>
      <PageHeader
        title="Overview"
        subtitle=""
        action={<RangePicker />}
      />
      <p className="-mt-4 mb-6 text-sm text-ink-soft">
        <Greeting />
      </p>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPIS.map(({ key, ...kpi }) => (
          <KpiCard key={key} {...kpi} />
        ))}
      </div>

      {/* Charts grid */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel
          title="Revenue vs target"
          subtitle="Last 9 months"
          className="lg:col-span-2"
        >
          <AreaRevenue />
        </Panel>

        <Panel title="Traffic sources" subtitle="This month">
          <DonutSources />
        </Panel>

        <Panel
          title="Demand forecast"
          subtitle="Predicted with 90% confidence band"
          className="lg:col-span-2"
        >
          <ForecastChart />
        </Panel>

        <Panel title="AI insights" subtitle="Auto-generated">
          <AiInsights />
        </Panel>

        <Panel
          title="Recent orders"
          className="lg:col-span-2"
          action={
            <a href="/dashboard/reports" className="text-sm font-medium text-primary">
              View all
            </a>
          }
        >
          <ActivityTable />
        </Panel>

        <Panel
          title="Anomaly alerts"
          action={
            <a href="/dashboard/alerts" className="text-sm font-medium text-primary">
              View all
            </a>
          }
        >
          <AnomalyFeed />
        </Panel>
      </div>
    </>
  );
}
