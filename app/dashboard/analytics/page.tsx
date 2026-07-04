import type { Metadata } from "next";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import CategoryBar from "@/components/dashboard/live/CategoryBar";
import ChannelDonut from "@/components/dashboard/live/ChannelDonut";
import RevenueExpenses from "@/components/dashboard/live/RevenueExpenses";
import SalesExplorer from "@/components/dashboard/live/SalesExplorer";
import RegionTable from "@/components/dashboard/live/RegionTable";
import { RangePicker } from "@/lib/filters";

export const metadata: Metadata = { title: "Analytics · Insightful" };

export default function AnalyticsPage() {
  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="Deep-dive into sales, categories and regions."
        action={<RangePicker />}
      />

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
        <Panel title="Revenue by region" subtitle="Selected period">
          <RegionTable />
        </Panel>

        <Panel
          title="Sales explorer"
          subtitle="Products → transactions drill-down"
          className="lg:col-span-3"
        >
          <SalesExplorer />
        </Panel>
      </div>
    </>
  );
}
