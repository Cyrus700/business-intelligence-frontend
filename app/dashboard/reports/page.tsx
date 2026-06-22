import type { Metadata } from "next";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import ActivityTable from "@/components/dashboard/ActivityTable";
import Icon from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Reports · Insightful" };

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Browse, filter and export your transactional data."
        action={
          <div className="flex gap-2">
            <button className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-medium text-ink hover:bg-bg-soft">
              <Icon name="table" className="h-4 w-4" /> CSV
            </button>
            <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-white shadow-lift hover:bg-primary-600">
              Generate report
            </button>
          </div>
        }
      />

      <Panel
        title="All orders"
        subtitle="2,148 records"
        action={
          <div className="hidden gap-2 sm:flex">
            {["All", "Paid", "Pending", "Failed"].map((f, i) => (
              <button
                key={f}
                className={
                  i === 0
                    ? "rounded-lg bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary"
                    : "rounded-lg px-3 py-1.5 text-sm text-ink-soft hover:bg-bg-soft"
                }
              >
                {f}
              </button>
            ))}
          </div>
        }
      >
        <ActivityTable />
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm text-ink-soft">
          <span>Showing 5 of 2,148</span>
          <div className="flex gap-1">
            <button className="rounded-lg border border-border px-3 py-1.5 hover:bg-bg-soft">Prev</button>
            <button className="rounded-lg border border-border px-3 py-1.5 hover:bg-bg-soft">Next</button>
          </div>
        </div>
      </Panel>
    </>
  );
}
