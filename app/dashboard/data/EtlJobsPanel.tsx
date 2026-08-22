"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Panel from "@/components/dashboard/Panel";
import Icon from "@/components/ui/Icon";
import { clsx } from "@/lib/cx";
import { apiGet, queryKeys } from "@/lib/api";
import type { EtlJob } from "@/lib/api";
import { formatDateTime, formatDuration, timeAgo } from "./format";

type Tab = "all" | "running" | "succeeded" | "failed";

const TABS: Array<{ value: Tab; label: string }> = [
  { value: "all", label: "All" },
  { value: "running", label: "Running" },
  { value: "succeeded", label: "Succeeded" },
  { value: "failed", label: "Failed" },
];

function StatusBadge({ status }: { status: string }) {
  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
        running
      </span>
    );
  }
  const cls =
    status === "succeeded"
      ? "bg-green-100 text-green-700"
      : status === "failed"
        ? "bg-warn-50 text-warn"
        : "bg-border text-ink-soft";
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", cls)}>
      {status}
    </span>
  );
}

export default function EtlJobsPanel({ canManage }: { canManage: boolean }) {
  const [tab, setTab] = useState<Tab>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.etlJobs.list(),
    queryFn: () => apiGet<EtlJob[]>("/etl/jobs", { page_size: 50 }),
    enabled: canManage,
    refetchInterval: (query) => {
      const hasRunning = query.state.data?.some((j) => j.status === "running") ?? false;
      return hasRunning ? 5000 : 15000;
    },
  });

  if (!canManage) {
    return (
      <Panel title="ETL pipelines" subtitle="Manager or Admin role required">
        <div className="flex flex-col items-center py-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-border/40 text-ink-muted">
            <Icon name="lock" className="h-6 w-6" />
          </span>
          <p className="mt-3 text-sm text-ink-soft">
            ETL pipeline monitoring requires Manager or Admin role.
          </p>
        </div>
      </Panel>
    );
  }

  const counts: Record<Tab, number> = { all: data?.length ?? 0, running: 0, succeeded: 0, failed: 0 };
  for (const j of data ?? []) counts[j.status as "running" | "succeeded" | "failed"] += 1;

  const rows = (data ?? []).filter((j) => tab === "all" || j.status === tab);

  return (
    <Panel
      title="ETL pipelines"
      subtitle={
        data?.some((j) => j.status === "running")
          ? "A pipeline is running — refreshing live"
          : "Recent runs (auto-refreshing)"
      }
      action={
        <div className="flex gap-1 rounded-xl bg-bg-soft p-1">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => {
                setTab(t.value);
                setOpenId(null);
              }}
              className={clsx(
                "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                tab === t.value
                  ? "bg-white text-ink shadow-sm"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              {t.label}
              <span className="ml-1 text-[11px] text-ink-muted">{counts[t.value]}</span>
            </button>
          ))}
        </div>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-sm text-ink-muted">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <span className="ml-2">Loading jobs…</span>
        </div>
      ) : error ? (
        <div className="rounded-xl bg-warn-50 px-4 py-3 text-sm text-warn">
          {error instanceof Error ? error.message : "Failed to load ETL jobs"}
        </div>
      ) : rows.length === 0 ? (
        <div className="py-8 text-center text-sm text-ink-muted">
          No {tab === "all" ? "" : tab + " "}ETL jobs yet.
        </div>
      ) : (
        <div className="-mx-5 -mb-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
<caption className="sr-only">ETL jobs</caption>
<caption className="sr-only">ETL jobs</caption>
            <thead>
              <tr className="border-b border-border text-xs font-semibold uppercase text-ink-muted">
                <th className="py-3 pl-5 pr-3" scope="col">Trigger</th>
                <th className="py-3 pr-3" scope="col">Status</th>
                <th className="py-3 pr-3" scope="col">Rows</th>
                <th className="py-3 pr-3" scope="col">Duration</th>
                <th className="py-3 pr-5 text-right" scope="col">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {rows.map((j) => (
                <JobRow
                  key={j.id}
                  job={j}
                  open={openId === j.id}
                  onToggle={() => setOpenId(openId === j.id ? null : j.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function JobRow({
  job,
  open,
  onToggle,
}: {
  job: EtlJob;
  open: boolean;
  onToggle: () => void;
}) {
  const failed = job.status === "failed";
  const running = job.status === "running";
  return (
    <>
      <tr className={clsx("hover:bg-bg-soft/50", open && "bg-bg-soft/40")}>
        <td className="py-3 pl-5 pr-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-border/40 px-2.5 py-0.5 text-xs font-medium capitalize text-ink">
            {job.trigger}
            {failed && <Icon name="alert" className="h-3 w-3 text-warn" />}
          </span>
        </td>
        <td className="py-3 pr-3">
          <StatusBadge status={job.status} />
        </td>
        <td className="py-3 pr-3 text-ink-soft">
          {job.rows_in != null && (
            <>
              <span className="font-medium text-ink">{job.rows_loaded?.toLocaleString() ?? "—"}</span>
              {" / "}
              {job.rows_in.toLocaleString()} in
            </>
          )}
          {job.rows_rejected ? (
            <span className="ml-1 text-warn">({job.rows_rejected} rejected)</span>
          ) : null}
        </td>
        <td className="py-3 pr-3 font-mono text-xs text-ink-soft">
          {running ? (
            <span className="text-primary">in progress…</span>
          ) : (
            formatDuration(job.started_at, job.finished_at)
          )}
        </td>
        <td className="py-3 pr-5 text-right text-ink-soft">
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs" title={formatDateTime(job.started_at)}>
              {timeAgo(job.started_at)}
            </span>
            {(failed || open) && (
              <button
                type="button"
                onClick={onToggle}
                aria-label="Toggle job details"
                aria-expanded={open}
                className="rounded-lg p-1 text-ink-muted hover:bg-border/50 hover:text-ink"
              >
                <Icon name="arrow" className={clsx("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
              </button>
            )}
          </div>
        </td>
      </tr>
      {open && (
        <tr className="bg-bg-soft/30">
          <td colSpan={5} className="border-t border-border/60 px-5 py-3 text-xs text-warn">
            {job.log?.error ? String(job.log.error) : "No failure details recorded."}
          </td>
        </tr>
      )}
    </>
  );
}
