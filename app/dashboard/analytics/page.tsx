import type { Metadata } from "next";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import AiInsights from "@/components/dashboard/AiInsights";
import AreaRevenue from "@/components/dashboard/charts/AreaRevenue";
import BarCategory from "@/components/dashboard/charts/BarCategory";
import DonutSources from "@/components/dashboard/charts/DonutSources";
import ForecastChart from "@/components/dashboard/charts/ForecastChart";

export const metadata: Metadata = { title: "Analytics · Insightful" };

export default function AnalyticsPage() {
  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="Deep-dive into trends, categories and forecasts."
        action={
          <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-white shadow-lift hover:bg-primary-600">
            Export report
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Sales by category" subtitle="Units sold" className="lg:col-span-2">
          <BarCategory />
        </Panel>
        <Panel title="Traffic sources">
          <DonutSources />
        </Panel>

        <Panel title="Revenue trend" subtitle="Revenue vs target" className="lg:col-span-2">
          <AreaRevenue />
        </Panel>
        <Panel title="AI insights" subtitle="Auto-generated">
          <AiInsights />
        </Panel>

        <Panel
          title="Demand forecast"
          subtitle="10-week projection with confidence band"
          className="lg:col-span-3"
        >
          <ForecastChart />
        </Panel>
      </div>
    </>
  );
}
