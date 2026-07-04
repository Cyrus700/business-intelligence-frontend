import type { Metadata } from "next";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import PagedTransactions from "@/components/dashboard/live/PagedTransactions";
import { RangePicker } from "@/lib/filters";

export const metadata: Metadata = { title: "Reports · Insightful" };

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Browse and drill into your transactional data. Automated PDF/XLSX exports land in Phase 5."
        action={<RangePicker />}
      />

      <Panel title="All transactions" subtitle="Selected period">
        <PagedTransactions />
      </Panel>
    </>
  );
}
