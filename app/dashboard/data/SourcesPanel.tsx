"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Panel from "@/components/dashboard/Panel";
import Icon from "@/components/ui/Icon";
import { clsx } from "@/lib/cx";
import { apiGet, queryKeys, runEtlSource } from "@/lib/api";
import type { DataSource } from "@/lib/api";

const DOMAIN_LABEL: Record<string, string> = {
  sales: "Sales",
  finance: "Finance",
  inventory: "Inventory",
};

const KIND_LABEL: Record<string, string> = {
  csv_upload: "CSV upload",
  excel_upload: "Excel upload",
  rest_api: "REST API",
  postgres: "PostgreSQL",
};

export default function SourcesPanel({ isAdmin }: { isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const [runId, setRunId] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<DataSource[]>({
    queryKey: queryKeys.dataSources.list(),
    queryFn: () => apiGet<DataSource[]>("/data-sources"),
    enabled: isAdmin,
  });

  const runMutation = useMutation({
    mutationFn: runEtlSource,
    onMutate: () => setRunError(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.etlJobs.all });
    },
    onError: (e: Error) => setRunError(e.message),
    onSettled: () => setRunId(null),
  });

  if (!isAdmin) {
    return (
      <Panel title="Data sources" subtitle="Admin only">
        <div className="flex flex-col items-center py-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-border/40 text-ink-muted">
            <Icon name="lock" className="h-6 w-6" />
          </span>
          <p className="mt-3 text-sm text-ink-soft">
            Data source management is available to Admins.
          </p>
          <p className="mt-1 text-xs text-ink-muted">Contact your admin to upgrade.</p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title="Data sources"
      subtitle={
        data?.length
          ? `${data.filter((s) => s.status === "active").length} active of ${data.length}`
          : "Connected data sources"
      }
    >
      {runError && (
        <div className="mb-3 rounded-xl border border-warn-200 bg-warn-50 px-4 py-2.5 text-sm text-warn">
          {runError}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-sm text-ink-muted">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <span className="ml-2">Loading sources…</span>
        </div>
      ) : error ? (
        <div className="rounded-xl bg-warn-50 px-4 py-3 text-sm text-warn">
          {error instanceof Error ? error.message : "Failed to load data sources"}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="py-8 text-center text-sm text-ink-muted">No data sources configured.</div>
      ) : (
        <div className="-mx-5 -mb-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
<caption className="sr-only">Data sources</caption>
<caption className="sr-only">Data sources</caption>
            <thead>
              <tr className="border-b border-border text-xs font-semibold uppercase text-ink-muted">
                <th className="py-3 pl-5 pr-3" scope="col">Name</th>
                <th className="py-3 pr-3" scope="col">Type</th>
                <th className="py-3 pr-3" scope="col">Domain</th>
                <th className="py-3 pr-3" scope="col">Status</th>
                <th className="py-3 pr-5 text-right" scope="col">Run</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {data.map((s) => {
                const running = runId === s.id;
                const isActive = s.status === "active";
                return (
                  <tr key={s.id} className="hover:bg-bg-soft/50">
                    <td className="max-w-48 truncate py-3 pl-5 pr-3 font-medium text-ink">
                      {s.name}
                    </td>
                    <td className="py-3 pr-3 text-ink-soft">{KIND_LABEL[s.kind] ?? s.kind}</td>
                    <td className="py-3 pr-3">
                      <span className="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium capitalize text-primary">
                        {DOMAIN_LABEL[s.target_domain] ?? s.target_domain}
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      <span
                        className={clsx(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                          isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-border text-ink-soft",
                        )}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 pr-5 text-right">
                      <button
                        type="button"
                        disabled={!isActive || running}
                        onClick={() => {
                          setRunId(s.id);
                          runMutation.mutate(s.id);
                        }}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-ink hover:bg-bg-soft disabled:cursor-not-allowed disabled:opacity-40"
                        title={
                          isActive
                            ? "Pull data from this source now"
                            : "Source is paused — cannot run"
                        }
                      >
                        {running ? (
                          <>
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                            Running…
                          </>
                        ) : (
                          <>
                            <Icon name="play" className="h-3.5 w-3.5" />
                            Run now
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
