"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet, queryKeys, npr } from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/Icon";
import { clsx } from "@/lib/cx";
import { RangePicker, apiParams, useFilters } from "@/lib/filters";

type AuditLog = {
  id: string;
  action: string;
  entity: string | null;
  entity_id: string | null;
  user_id: string | null;
  ip: string | null;
  user_agent: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
};

type PaginatedAuditLogs = {
  items: AuditLog[];
  total: number;
  page: number;
  page_size: number;
};

export default function AuditClient() {
  const { filters } = useFilters();
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const { data, isLoading, error } = useQuery<PaginatedAuditLogs>({
    queryKey: ["audit-logs", apiParams(filters), page, pageSize],
    queryFn: () => apiGet("/audit-logs", { ...apiParams(filters), page, page_size: pageSize }),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const formatAction = (action: string) => {
    const [method, path] = action.split(" ", 2);
    return (
      <span className="flex items-center gap-2">
        <Badge
          variant={
            method === "GET" ? "success" :
            method === "POST" ? "warning" :
            method === "PATCH" || method === "PUT" ? "secondary" :
            method === "DELETE" ? "destructive" : "secondary"
          }
          className="text-xs"
        >
          {method}
        </Badge>
        <code className="text-xs text-ink-soft font-mono">{path}</code>
      </span>
    );
  };

  const formatDetail = (detail: Record<string, unknown> | null) => {
    if (!detail) return <span className="text-ink-muted">—</span>;
    const keys = Object.keys(detail).slice(0, 3);
    return (
      <span className="text-xs text-ink-muted font-mono">
        {keys.map((k) => `${k}: ${String(detail[k]).slice(0, 30)}`).join(", ")}
        {Object.keys(detail).length > 3 && " …"}
      </span>
    );
  };

  return (
    <>
      <PageHeader
        title="Audit Logs"
        subtitle="System audit trail with request correlation. Filter by date range."
        action={<RangePicker />}
      />

      <Panel title="Audit Entries" subtitle={data ? `Showing ${data.items.length} of ${data.total}` : "Loading…"}>
        {isLoading ? (
          <div className="text-center py-8 text-ink-muted">Loading audit logs…</div>
        ) : error ? (
          <div className="text-center py-8 text-warn">Failed to load audit logs</div>
        ) : data?.items.length === 0 ? (
          <div className="text-center py-8 text-ink-muted">No audit entries for selected range</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
<caption className="sr-only">Audit log</caption>
<caption className="sr-only">Audit log</caption>
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="pb-2 pr-4" scope="col">Time</th>
                    <th className="pb-2 pr-4" scope="col">Action</th>
                    <th className="pb-2 pr-4" scope="col">Entity</th>
                    <th className="pb-2 pr-4" scope="col">User</th>
                    <th className="pb-2 pr-4" scope="col">IP</th>
                    <th className="pb-2 pr-4" scope="col">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((log) => (
                    <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 pr-4 text-ink-muted font-mono">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-2 pr-4">{formatAction(log.action)}</td>
                      <td className="py-2 pr-4">
                        {log.entity && (
                          <>
                            <span className="font-medium">{log.entity}</span>
                            {log.entity_id && (
                              <span className="ml-2 text-xs text-ink-muted font-mono">{log.entity_id.slice(0, 8)}…</span>
                            )}
                          </>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-ink-muted font-mono text-xs">
                        {log.user_id ? log.user_id.slice(0, 8) + "…" : "—"}
                      </td>
                      <td className="py-2 pr-4 text-ink-muted text-xs">{log.ip || "—"}</td>
                      <td className="py-2 pr-4 max-w-xs truncate">{formatDetail(log.detail)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data && data.total > pageSize && (
              <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                <p className="text-sm text-ink-soft">
                  Page {page} of {Math.ceil(data.total / pageSize)} — {data.total} total entries
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-white hover:bg-bg-soft disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(Math.ceil(data.total / pageSize), p + 1))}
                    disabled={page >= Math.ceil(data.total / pageSize)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-white hover:bg-bg-soft disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Panel>

      {/* Role Changes Panel - separate endpoint */}
      <Panel title="Role Changes" subtitle="RBAC matrix modifications">
        <RoleChangesPanel filters={filters} />
      </Panel>
    </>
  );
}

function RoleChangesPanel({ filters }: { filters: ReturnType<typeof useFilters>["filters"] }) {
  const { data, isLoading, error } = useQuery<Array<any>>({
    queryKey: ["audit-logs", "role-changes", apiParams(filters)],
    queryFn: () => apiGet("/audit-logs/role-changes", apiParams(filters)),
    staleTime: 60_000,
  });

  if (isLoading) return <div className="text-center py-8 text-ink-muted">Loading…</div>;
  if (error) return <div className="text-center py-8 text-warn">Failed to load</div>;
  if (!data?.length) return <div className="text-center py-8 text-ink-muted">No role changes in range</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-500">
            <th className="pb-2 pr-4" scope="col">Time</th>
            <th className="pb-2 pr-4" scope="col">Actor</th>
            <th className="pb-2 pr-4" scope="col">Action</th>
            <th className="pb-2 pr-4" scope="col">Role</th>
            <th className="pb-2 pr-4" scope="col">Permission</th>
            <th className="pb-2 pr-4" scope="col">Old</th>
            <th className="pb-2 pr-4" scope="col">New</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((row: any) => (
            <tr key={row.id} className="border-b border-slate-100">
              <td className="py-2 pr-4 text-ink-muted">{new Date(row.created_at).toLocaleString()}</td>
              <td className="py-2 pr-4 text-xs font-mono">{row.actor_id?.slice(0, 8) ?? "—"}</td>
              <td className="py-2 pr-4">
                <Badge variant={row.action === "grant" ? "success" : row.action === "revoke" ? "destructive" : "secondary"} className="text-xs">
                  {row.action}
                </Badge>
              </td>
              <td className="py-2 pr-4 font-medium">{row.role}</td>
              <td className="py-2 pr-4 text-ink-muted">{row.permission}</td>
              <td className="py-2 pr-4 text-ink-muted">{row.old_value ?? "—"}</td>
              <td className="py-2 pr-4 text-ink-muted">{row.new_value ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}