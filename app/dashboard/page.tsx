import type { Metadata } from "next";
import PageHeader from "@/components/dashboard/PageHeader";
import Greeting from "@/components/dashboard/Greeting";
import Panel from "@/components/dashboard/Panel";
import AiInsights from "@/components/dashboard/AiInsights";
import AnomalyFeed from "@/components/dashboard/AnomalyFeed";
import ForecastChart from "@/components/dashboard/charts/ForecastChart";
import KpiRow from "@/components/dashboard/live/KpiRow";
import RevenueExpenses from "@/components/dashboard/live/RevenueExpenses";
import ChannelDonut from "@/components/dashboard/live/ChannelDonut";
import TransactionsTable from "@/components/dashboard/live/TransactionsTable";
import LowStock from "@/components/dashboard/live/LowStock";
import { RangePicker } from "@/lib/filters";

export const metadata: Metadata = { title: "Overview · Insightful" };

export default function OverviewPage() {
  return (
    <>
      <PageHeader title="Overview" subtitle="" action={<RangePicker />} />
      <p className="-mt-4 mb-6 text-sm text-ink-soft">
        <Greeting />
      </p>

      <KpiRow />

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

        <Panel
          title="Demand forecast"
          subtitle="Sample preview — live model lands in Phase 4"
          className="lg:col-span-2"
        >
          <ForecastChart />
        </Panel>

        <Panel title="AI insights" subtitle="Sample preview — live in Phase 5">
          <AiInsights />
        </Panel>

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

      <div className="mt-4">
        <Panel title="Anomaly alerts" subtitle="Sample preview — live detection lands in Phase 4">
          <AnomalyFeed />
        </Panel>
      </div>
    </>
  );
}
