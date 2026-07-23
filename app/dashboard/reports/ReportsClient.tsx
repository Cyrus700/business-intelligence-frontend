"use client";

import { useState } from "react";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import PagedTransactions from "@/components/dashboard/live/PagedTransactions";
import Icon from "@/components/ui/Icon";
import { RangePicker } from "@/lib/filters";
import { useRole, hasMinRole } from "@/lib/use-role";
import { useApi, generateReport as apiGenerateReport, type ReportOut, type ReportRequest } from "@/lib/api";

function ReportList() {
  const { data, error, loading } = useApi<ReportOut[]>("/reports");
  if (error) return <p className="text-sm text-warn">{error}</p>;
  if (loading) return <div className="h-16 animate-pulse rounded-xl bg-bg-soft" />;
  if (!data || data.length === 0) return <p className="text-sm text-ink-soft">No reports yet</p>;
  return (
    <div className="space-y-2">
      {data.map((r) => (
        <div key={r.id} className="flex items-center justify-between rounded-xl border border-border p-3">
          <div>
            <p className="text-sm font-medium text-ink capitalize">{r.report_type} report</p>
            <p className="text-xs text-ink-muted">
              {r.period_start} – {r.period_end} · {r.format.toUpperCase()}
            </p>
          </div>
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"}/reports/${r.id}/download`}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-ink hover:bg-bg-soft"
          >
            <Icon name="arrow" className="h-3.5 w-3.5" />
            Download
          </a>
        </div>
      ))}
    </div>
  );
}

export default function ReportsClient() {
  const role = useRole();
  const canGenerate = hasMinRole(role, "manager");
  const [genMsg, setGenMsg] = useState("");

  async function handleGenerateReport() {
    setGenMsg("");
    try {
      const body: ReportRequest = {
        period_start: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
        period_end: new Date().toISOString().split("T")[0],
        format: "pdf",
      };
      await apiGenerateReport(body);
      setGenMsg("Report queued — refresh to see it");
      setTimeout(() => setGenMsg(""), 4000);
    } catch {
      setGenMsg("Failed to generate report");
      setTimeout(() => setGenMsg(""), 4000);
    }
  }

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Browse and drill into your transactional data."
        action={
          <div className="flex items-center gap-2">
            <RangePicker />
            {canGenerate && (
              <button
                onClick={handleGenerateReport}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-white shadow-lift hover:bg-primary-600"
              >
                <Icon name="table" className="h-4 w-4" />
                Generate report
              </button>
            )}
          </div>
        }
      />

      {role === "analyst" && (
        <div className="mb-4 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
          You can view and download reports. Contact a manager to generate new ones.
        </div>
      )}

      {genMsg && (
        <div className={`mb-4 rounded-xl px-4 py-3 text-sm ${genMsg.startsWith("Failed") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {genMsg}
        </div>
      )}

      {canGenerate && (
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <button
            onClick={handleGenerateReport}
            className="rounded-xl border border-border p-4 text-left hover:bg-bg-soft"
          >
            <span className="text-sm font-medium text-ink">Export as PDF</span>
            <p className="mt-0.5 text-xs text-ink-muted">Last 30 days summary</p>
          </button>
          <button className="rounded-xl border border-border p-4 text-left hover:bg-bg-soft">
            <span className="text-sm font-medium text-ink">Schedule report</span>
            <p className="mt-0.5 text-xs text-ink-muted">Weekly or monthly digest</p>
          </button>
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"}/reports`}
            className="block rounded-xl border border-border p-4 text-left hover:bg-bg-soft"
          >
            <span className="text-sm font-medium text-ink">Browse reports</span>
            <p className="mt-0.5 text-xs text-ink-muted">View all generated reports</p>
          </a>
        </div>
      )}

      <Panel title="Generated reports" subtitle="Latest reports">
        <ReportList />
      </Panel>

      <div className="mt-4">
        <Panel title="All transactions" subtitle="Selected period">
          <PagedTransactions />
        </Panel>
      </div>
    </>
  );
}
