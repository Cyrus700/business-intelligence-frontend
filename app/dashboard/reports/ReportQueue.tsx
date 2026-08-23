"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Icon from "@/components/ui/Icon";
import { getReportJobs, type ReportJobOut, downloadReport } from "@/lib/api";

function fmtDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 ring-amber-200",
    claimed: "bg-sky-50 text-sky-700 ring-sky-200",
    succeeded: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    failed: "bg-red-50 text-red-700 ring-red-200",
  };
  const cls = map[status] ?? "bg-bg-soft text-ink-soft ring-border";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${cls}`}>
      {status === "pending" && <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />}
      {status === "claimed" && <span className="h-3 w-3 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600" />}
      {status === "succeeded" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
      {status === "failed" && <Icon name="alert" className="h-3 w-3" />}
      <span className="capitalize">{status === "claimed" ? "Processing" : status === "pending" ? "Queued" : status}</span>
    </span>
  );
}

export default function ReportQueue() {
  const { data, error, isLoading } = useQuery<ReportJobOut[]>({
    queryKey: ["report-jobs"],
    queryFn: () => getReportJobs({ limit: 50 }),
    refetchInterval: 2500,
  });

  if (error) return <p className="text-sm text-warn">{(error as Error).message}</p>;
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-bg-soft" />
        ))}
      </div>
    );
  }

  const jobs = data ?? [];
  if (jobs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-bg-soft/30 p-4 text-center">
        <p className="text-sm font-medium text-ink">Queue empty</p>
        <p className="mt-1 text-xs text-ink-soft">Worker idle · Ready for next export.</p>
      </div>
    );
  }

  // Sort: pending first, then claimed, then succeeded/failed by time
  const sorted = [...jobs].sort((a, b) => {
    const order: Record<string, number> = { pending: 0, claimed: 1, succeeded: 2, failed: 3 };
    const oa = order[a.status] ?? 9;
    const ob = order[b.status] ?? 9;
    if (oa !== ob) return oa - ob;
    return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
  });

  const queued = sorted.filter((j) => j.status === "pending").length;
  const processing = sorted.filter((j) => j.status === "claimed").length;
  const completed = sorted.filter((j) => j.status === "succeeded").length;

  return <ReportQueueInner jobs={sorted} queued={queued} processing={processing} completed={completed} />;
}

function ReportQueueInner({ jobs, queued, processing, completed }: { jobs: ReportJobOut[]; queued: number; processing: number; completed: number }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? jobs.slice(0, 20) : jobs.slice(0, 5);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-full bg-ink px-3 py-2 text-xs font-medium text-white">
        <span className={`h-2 w-2 rounded-full ${queued > 0 || processing > 0 ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
        <span className="font-semibold">
          {queued} queued · {processing} processing · {completed} completed
        </span>
        <span className="hidden text-white/60 sm:inline">· Worker concurrency 2</span>
        <span className="ml-auto hidden text-white/50 sm:inline">Even 100 simultaneous exports are queued, not dropped</span>
        {jobs.length > 5 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-auto rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white hover:bg-white/25 sm:ml-2"
          >
            {expanded ? "Collapse" : `View all ${jobs.length}`}
          </button>
        )}
      </div>

      <div className={`grid gap-2 ${!expanded && jobs.length > 5 ? "max-h-[320px] overflow-hidden" : ""}`}>
        {visible.map((job) => {
          const isPdf = job.format === "pdf";
          const isDone = job.status === "succeeded" && job.report_id;
          const isFailed = job.status === "failed";
          return (
            <div key={job.id} className="flex items-center gap-3 rounded-xl border border-border bg-white px-3 py-2.5">
              <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white ${isPdf ? "bg-gradient-to-br from-red-500 to-orange-500" : "bg-gradient-to-br from-emerald-600 to-teal-600"}`}>
                <Icon name={isPdf ? "document" : "table"} className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="truncate text-xs font-semibold text-ink">
                    {job.period_start && job.period_end ? `${fmtDate(job.period_start)} – ${fmtDate(job.period_end)}` : "Report"}
                  </p>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${isPdf ? "bg-red-50 text-red-700 ring-1 ring-red-200" : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"}`}>
                    {job.format?.toUpperCase()}
                  </span>
                  <StatusBadge status={job.status} />
                  {job.position && job.status === "pending" && (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
                      #{job.position} · ~{job.estimated_wait_seconds}s
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {job.created_at ? new Date(job.created_at).toLocaleTimeString() : ""} · {job.id.slice(0, 8)}
                </p>
              </div>
              <div className="ml-auto shrink-0">
                {isDone && job.report_id && job.format && job.period_start && job.period_end ? (
                  <button
                    onClick={() => downloadReport({ id: job.report_id!, report_type: "custom", period_start: job.period_start!, period_end: job.period_end!, format: job.format as "pdf" | "xlsx", created_at: job.finished_at ?? new Date().toISOString() })}
                    className="inline-flex h-7 items-center gap-1 rounded-full border border-border bg-white px-2.5 text-xs font-semibold text-ink hover:bg-bg-soft"
                  >
                    <Icon name="download" className="h-3 w-3" /> Download
                  </button>
                ) : isFailed ? (
                  <span className="text-xs font-medium text-red-600">Failed</span>
                ) : (
                  <span className="text-xs text-ink-muted">{job.status === "pending" ? "Queued" : "Working"}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {!expanded && jobs.length > 5 && (
        <p className="text-center text-xs text-ink-muted">Showing 5 of {jobs.length} · Expand to see all</p>
      )}
    </div>
  );
}
