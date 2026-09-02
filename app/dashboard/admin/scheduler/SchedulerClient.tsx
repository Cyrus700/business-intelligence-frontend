"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, queryKeys } from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/Icon";
import { clsx } from "@/lib/cx";

type SchedulerJob = {
  id: string;
  name: string;
  next_run: string | null;
  last_run: string | null;
  status: "scheduled" | "running" | "success" | "failed";
  schedule: string;
  trigger: string;
};

type SchedulerStatus = {
  running: boolean;
  jobs: SchedulerJob[];
  timezone: string;
};

export default function SchedulerClient() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: status, isLoading, error } = useQuery<SchedulerStatus>({
    queryKey: ["scheduler", "status"],
    queryFn: () => apiGet("/admin/scheduler/status"),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const triggerMutation = useMutation({
    mutationFn: (jobId: string) => apiPost(`/admin/scheduler/trigger/${jobId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduler", "status"] });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: (jobId: string) => apiPost(`/admin/scheduler/pause/${jobId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduler", "status"] });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: (jobId: string) => apiPost(`/admin/scheduler/resume/${jobId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduler", "status"] });
    },
  });

  const statusBadge = (s: string) => {
    const variants: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
      scheduled: "secondary",
      running: "warning",
      success: "success",
      failed: "destructive",
    };
    return <Badge variant={variants[s] || "secondary"} className="text-xs capitalize">{s}</Badge>;
  };

  const formatNextRun = (iso: string | null) => {
    if (!iso) return "—";
    const date = new Date(iso);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    if (diff < 0) return `Overdue (${date.toLocaleTimeString()})`;
    const mins = Math.round(diff / 60000);
    if (mins < 60) return `In ${mins}m (${date.toLocaleTimeString()})`;
    const hours = Math.round(diff / 3600000);
    return `In ${hours}h (${date.toLocaleTimeString()})`;
  };

  return (
    <>
      <PageHeader
        title="Scheduler Management"
        subtitle="Jobs."
        action={
          <button
            onClick={() => {
              setRefreshing(true);
              queryClient.invalidateQueries({ queryKey: ["scheduler", "status"] });
              setTimeout(() => setRefreshing(false), 1000);
            }}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-white text-sm font-medium text-ink hover:bg-bg-soft disabled:opacity-50"
          >
            <Icon name="refresh" className={clsx("h-4 w-4", refreshing && "animate-spin")} />
            Refresh
          </button>
        }
      />

      <Panel title="Scheduler Status" subtitle={status ? `Timezone: ${status.timezone} · ${status.running ? "Running" : "Stopped"}` : "Loading…"}>
        {isLoading ? (
          <div className="text-center py-8 text-ink-muted">Loading scheduler status…</div>
        ) : error ? (
          <div className="text-center py-8 text-warn">Failed to load scheduler: {(error as Error).message}</div>
        ) : status ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Badge variant={status.running ? "success" : "destructive"} className="text-sm">
                {status.running ? "Scheduler Running" : "Scheduler Stopped"}
              </Badge>
              <span className="text-sm text-ink-muted">{status.jobs.length} job(s) configured</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
<caption className="sr-only">Scheduled jobs</caption>
<caption className="sr-only">Scheduled jobs</caption>
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="pb-2 pr-4" scope="col">Job</th>
                    <th className="pb-2 pr-4" scope="col">Schedule</th>
                    <th className="pb-2 pr-4" scope="col">Trigger</th>
                    <th className="pb-2 pr-4" scope="col">Next Run</th>
                    <th className="pb-2 pr-4" scope="col">Last Run</th>
                    <th className="pb-2 pr-4" scope="col">Status</th>
                    <th className="pb-2 pr-4" scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {status.jobs.map((job) => (
                    <tr key={job.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 pr-4 font-medium">{job.name}</td>
                      <td className="py-2 pr-4 font-mono text-xs">{job.schedule}</td>
                      <td className="py-2 pr-4 text-ink-muted">{job.trigger}</td>
                      <td className="py-2 pr-4">{formatNextRun(job.next_run)}</td>
                      <td className="py-2 pr-4 text-ink-muted">
                        {job.last_run ? new Date(job.last_run).toLocaleString() : "Never"}
                      </td>
                      <td className="py-2 pr-4">{statusBadge(job.status)}</td>
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          {job.status !== "running" && (
                            <button
                              onClick={() => triggerMutation.mutate(job.id)}
                              disabled={triggerMutation.isPending}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-white hover:bg-bg-soft disabled:opacity-50"
                            >
                              Run Now
                            </button>
                          )}
                          {job.status === "scheduled" && (
                            <button
                              onClick={() => pauseMutation.mutate(job.id)}
                              disabled={pauseMutation.isPending}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-white hover:bg-bg-soft disabled:opacity-50"
                            >
                              Pause
                            </button>
                          )}
                          {job.status !== "scheduled" && (
                            <button
                              onClick={() => resumeMutation.mutate(job.id)}
                              disabled={resumeMutation.isPending}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-white hover:bg-bg-soft disabled:opacity-50"
                            >
                              Resume
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </Panel>

      <Panel title="Job Details" subtitle="Click a job to see execution history and logs">
        <p className="text-sm text-ink-muted">Select a job from the table above to view detailed execution history, logs, and configuration.</p>
      </Panel>
    </>
  );
}