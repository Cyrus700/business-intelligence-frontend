"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import Icon from "@/components/ui/Icon";
import { clsx } from "@/lib/cx";
import { useRole, hasMinRole } from "@/lib/use-role";
import { apiGet, uploadFile } from "@/lib/api";
import type { DataSource, EtlJob, UploadResult } from "@/lib/api";

const DOMAIN_LABEL: Record<string, string> = {
  sales: "Sales",
  finance: "Finance",
  inventory: "Inventory",
};

const KIND_ICON: Record<string, string> = {
  csv_upload: "table",
  excel_upload: "table",
  rest_api: "pipe",
  postgres: "pipe",
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  paused: "bg-ink-muted/10 text-ink-muted",
  failed: "bg-warn-50 text-warn",
  loaded: "bg-green-100 text-green-700",
  received: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  running: "bg-primary-50 text-primary",
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_BADGE[status] ?? "bg-border text-ink-soft";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${s}`}>
      {status}
    </span>
  );
}

// ─── Upload Panel (manager+) ─────────────────────────────────────

function UploadPanel({ canManage }: { canManage: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [domain, setDomain] = useState("sales");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!canManage) {
    return (
      <Panel title="Upload data" subtitle="Upgrade to upload">
        <div className="flex flex-col items-center py-6 text-center">
          <span className="text-3xl text-ink-muted">🔒</span>
          <p className="mt-2 text-sm text-ink-soft">
            Uploading data files requires Manager or Admin role.
          </p>
          <p className="mt-1 text-xs text-ink-muted">Contact your admin to upgrade.</p>
        </div>
      </Panel>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const res = await uploadFile(file, domain);
      setResult(res);
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Panel title="Upload data" subtitle="CSV or Excel files">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-warn-50 px-4 py-3 text-sm text-warn">{error}</div>
        )}
        {result && (
          <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
            Loaded <strong>{result.row_count ?? 0}</strong> rows into {DOMAIN_LABEL[domain]}{" "}
            {result.etl_job_id && <>· ETL job: {result.etl_job_id.slice(0, 8)}…</>}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">Target domain</span>
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-white px-3.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
            >
              <option value="sales">Sales</option>
              <option value="finance">Finance</option>
              <option value="inventory">Inventory</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">File</span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="h-11 w-full rounded-xl border border-border bg-white px-3.5 text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-1 file:text-xs file:font-medium file:text-primary hover:file:bg-primary-100"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={!file || uploading}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-white shadow-lift hover:bg-primary-600 disabled:opacity-50"
        >
          {uploading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Uploading…
            </>
          ) : (
            <>
              <Icon name="table" className="h-4 w-4" />
              Upload
            </>
          )}
        </button>
      </form>
    </Panel>
  );
}

// ─── Data Sources Panel (admin-only) ──────────────────────────────

function DataSourcesPanel({ isAdmin }: { isAdmin: boolean }) {
  const { data, isLoading, error } = useQuery<DataSource[]>({
    queryKey: ["data-sources"],
    queryFn: () => apiGet<DataSource[]>("/data-sources"),
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return (
      <Panel title="Data sources" subtitle="Admin only">
        <div className="flex flex-col items-center py-6 text-center">
          <span className="text-3xl text-ink-muted">🔒</span>
          <p className="mt-2 text-sm text-ink-soft">Data source management is available to Admins.</p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Data sources" subtitle="Connected data sources">
      {isLoading ? (
        <div className="flex items-center justify-center py-6 text-sm text-ink-muted">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <span className="ml-2">Loading sources…</span>
        </div>
      ) : error ? (
        <div className="rounded-xl bg-warn-50 px-4 py-3 text-sm text-warn">
          {error instanceof Error ? error.message : "Failed to load data sources"}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="py-6 text-center text-sm text-ink-muted">No data sources configured.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-semibold uppercase text-ink-muted">
                <th className="pb-3 pr-3">Name</th>
                <th className="pb-3 pr-3">Type</th>
                <th className="pb-3 pr-3">Domain</th>
                <th className="pb-3 pr-3">Schedule</th>
                <th className="pb-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((s) => (
                <tr key={s.id} className="hover:bg-bg-soft/50">
                  <td className="py-3 pr-3 font-medium text-ink">{s.name}</td>
                  <td className="py-3 pr-3 text-ink-soft capitalize">{s.kind.replace("_", " ")}</td>
                  <td className="py-3 pr-3 text-ink-soft">{DOMAIN_LABEL[s.target_domain] ?? s.target_domain}</td>
                  <td className="py-3 pr-3 text-ink-soft">{s.schedule_cron ?? "—"}</td>
                  <td className="py-3 text-right"><StatusBadge status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

// ─── ETL Jobs Panel (manager+) ────────────────────────────────────

function EtlJobsPanel({ canManage }: { canManage: boolean }) {
  const { data, isLoading, error } = useQuery<EtlJob[]>({
    queryKey: ["etl-jobs"],
    queryFn: () => apiGet<EtlJob[]>("/etl/jobs"),
    enabled: canManage,
  });

  if (!canManage) {
    return (
      <Panel title="ETL pipelines" subtitle="Upgrade to view">
        <div className="flex flex-col items-center py-6 text-center">
          <span className="text-3xl text-ink-muted">🔒</span>
          <p className="mt-2 text-sm text-ink-soft">ETL pipeline monitoring requires Manager or Admin role.</p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="ETL pipelines" subtitle="Recent runs">
      {isLoading ? (
        <div className="flex items-center justify-center py-6 text-sm text-ink-muted">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <span className="ml-2">Loading jobs…</span>
        </div>
      ) : error ? (
        <div className="rounded-xl bg-warn-50 px-4 py-3 text-sm text-warn">
          {error instanceof Error ? error.message : "Failed to load ETL jobs"}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="py-6 text-center text-sm text-ink-muted">No ETL jobs yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-semibold uppercase text-ink-muted">
                <th className="pb-3 pr-3">Trigger</th>
                <th className="pb-3 pr-3">Status</th>
                <th className="pb-3 pr-3">Rows</th>
                <th className="pb-3 pr-3">Started</th>
                <th className="pb-3 text-right">Finished</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((j) => (
                <tr key={j.id} className="hover:bg-bg-soft/50">
                  <td className="py-3 pr-3 font-medium text-ink capitalize">{j.trigger}</td>
                  <td className="py-3 pr-3"><StatusBadge status={j.status} /></td>
                  <td className="py-3 pr-3 text-ink-soft">
                    {j.rows_loaded != null ? `${j.rows_loaded} loaded` : "—"}
                    {j.rows_rejected ? ` (${j.rows_rejected} rejected)` : ""}
                  </td>
                  <td className="py-3 pr-3 text-ink-soft font-mono text-xs">
                    {new Date(j.started_at).toLocaleString()}
                  </td>
                  <td className="py-3 text-right text-ink-soft font-mono text-xs">
                    {j.finished_at ? new Date(j.finished_at).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────

export default function DataClient() {
  const role = useRole();
  const canManage = hasMinRole(role, "manager");
  const isAdmin = hasMinRole(role, "admin");

  return (
    <>
      <PageHeader
        title="Data Integration"
        subtitle="Upload data files, manage sources, and monitor ETL pipelines."
      />

      {role === "analyst" && (
        <div className="mb-4 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
          You can view data on dashboards. Managers can upload files and run ETL. Admins can manage data sources.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <UploadPanel canManage={canManage} />
        <DataSourcesPanel isAdmin={isAdmin} />
      </div>

      <div className="mt-4">
        <EtlJobsPanel canManage={canManage} />
      </div>
    </>
  );
}
