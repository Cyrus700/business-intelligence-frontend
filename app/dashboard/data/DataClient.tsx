"use client";

import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/dashboard/PageHeader";
import Icon from "@/components/ui/Icon";
import { apiGet, getUploads, queryKeys } from "@/lib/api";
import type { EtlJob } from "@/lib/api";
import { useRole, hasMinRole } from "@/lib/use-role";
import UploadPanel from "./UploadPanel";
import UploadHistory from "./UploadHistory";
import EtlJobsPanel from "./EtlJobsPanel";
import SourcesPanel from "./SourcesPanel";
import { timeAgo } from "./format";

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4 shadow-card">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
        <p className="truncate text-lg font-semibold leading-tight text-ink">{value}</p>
        <p className="truncate text-xs text-ink-soft">{sub}</p>
      </div>
    </div>
  );
}

function StatsStrip() {
  const uploads = useQuery({
    queryKey: queryKeys.uploads.list(1),
    queryFn: () => getUploads({ page: 1, page_size: 1 }),
    staleTime: 30_000,
  });
  const jobs = useQuery({
    queryKey: queryKeys.etlJobs.list(),
    queryFn: () => apiGet<EtlJob[]>("/etl/jobs", { page_size: 50 }),
    staleTime: 30_000,
  });

  const list = jobs.data ?? [];
  const rowsLoaded = list.reduce((sum, j) => sum + (j.rows_loaded ?? 0), 0);
  const succeeded = list.filter((j) => j.status === "succeeded").length;
  const successRate = list.length ? Math.round((succeeded / list.length) * 100) : null;
  const lastRun = list
    .filter((j) => j.finished_at)
    .sort((a, b) => (b.finished_at ?? "").localeCompare(a.finished_at ?? ""))[0];

  return (
    <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        icon={<Icon name="table" className="h-5 w-5" />}
        label="Files processed"
        value={uploads.data ? uploads.data.total.toLocaleString() : "—"}
        sub={uploads.isLoading ? "loading…" : "all time"}
      />
      <StatCard
        icon={<Icon name="trend" className="h-5 w-5" />}
        label="Rows loaded"
        value={rowsLoaded.toLocaleString()}
        sub="from recent pipelines"
      />
      <StatCard
        icon={<Icon name="check" className="h-5 w-5" />}
        label="Success rate"
        value={successRate != null ? `${successRate}%` : "—"}
        sub={`${succeeded} of ${list.length} runs succeeded`}
      />
      <StatCard
        icon={<Icon name="gear" className="h-5 w-5" />}
        label="Last run"
        value={lastRun?.finished_at ? timeAgo(lastRun.finished_at) : "—"}
        sub={lastRun ? `ETL job ${lastRun.id.slice(0, 8)}…` : "no runs yet"}
      />
    </div>
  );
}

function AnalystInfoCard() {
  return (
    <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50/70 px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
          <Icon name="spark" className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-blue-900">
            You have read-only access to data integration
          </p>
          <p className="mt-0.5 text-sm text-blue-800">
            Explore live KPIs, trends and forecasts on the dashboards — everything updates
            automatically as new data arrives. Managers can upload files and run pipelines; Admins
            can manage data sources.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DataClient() {
  const role = useRole();
  const canManage = hasMinRole(role, "manager");
  const isAdmin = hasMinRole(role, "admin");

  return (
    <>
      <PageHeader
        title="Data Integration"
        subtitle="Upload data files, inspect validation reports, and monitor ETL pipelines."
      />

      {canManage ? <StatsStrip /> : <AnalystInfoCard />}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <UploadPanel canManage={canManage} />
        <SourcesPanel isAdmin={isAdmin} />
      </div>

      <div className="mt-4">
        <UploadHistory canManage={canManage} />
      </div>

      <div className="mt-4">
        <EtlJobsPanel canManage={canManage} />
      </div>
    </>
  );
}
