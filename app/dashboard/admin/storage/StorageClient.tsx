"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet, queryKeys } from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/Icon";
import { clsx } from "@/lib/cx";

type StorageInfo = {
  backend: "s3" | "local";
  bucket?: string;
  root_path?: string;
  total_files: number;
  total_size_bytes: number;
  usage_by_type: Record<string, { count: number; size_bytes: number }>;
  recent_uploads: Array<{
    key: string;
    size: number;
    type: string;
    uploaded_at: string;
  }>;
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function StorageClient() {
  const { data, isLoading, error } = useQuery<StorageInfo>({
    queryKey: ["admin", "storage"],
    queryFn: () => apiGet("/admin/storage"),
    staleTime: 60_000,
  });

  const backendBadge = (b: string) => (
    <Badge variant={b === "s3" ? "success" : "secondary"} className="text-xs">
      {b.toUpperCase()}
    </Badge>
  );

  return (
    <>
      <PageHeader
        title="Storage Management"
        subtitle="File storage backend, usage statistics, and recent uploads."
      />

      <Panel title="Storage Backend" subtitle={data ? `Backend: ${data.backend}` : "Loading…"}>
        {isLoading ? (
          <div className="text-center py-8 text-ink-muted">Loading storage info…</div>
        ) : error ? (
          <div className="text-center py-8 text-warn">Failed to load storage info</div>
        ) : data ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="p-4 bg-white rounded-xl border border-border">
              <p className="text-sm text-ink-soft">Backend</p>
              <p className="mt-1 flex items-center gap-2 font-medium">
                {backendBadge(data.backend)}
              </p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-border">
              <p className="text-sm text-ink-soft">Total Files</p>
              <p className="mt-1 text-2xl font-bold text-ink">{data.total_files.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-border">
              <p className="text-sm text-ink-soft">Total Size</p>
              <p className="mt-1 text-2xl font-bold text-ink">{formatBytes(data.total_size_bytes)}</p>
            </div>
            {data.backend === "s3" && data.bucket && (
              <div className="p-4 bg-white rounded-xl border border-border md:col-span-2">
                <p className="text-sm text-ink-soft">S3 Bucket</p>
                <p className="mt-1 font-mono text-sm text-ink">{data.bucket}</p>
              </div>
            )}
            {data.backend === "local" && data.root_path && (
              <div className="p-4 bg-white rounded-xl border border-border md:col-span-2">
                <p className="text-sm text-ink-soft">Local Root</p>
                <p className="mt-1 font-mono text-sm text-ink">{data.root_path}</p>
              </div>
            )}
          </div>
        ) : null}
      </Panel>

      <Panel title="Usage by File Type" subtitle={data ? `${Object.keys(data.usage_by_type).length} type(s)` : "Loading…"}>
        {isLoading || error || !data ? null : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
<caption className="sr-only">Stored files</caption>
<caption className="sr-only">Storage by type</caption>
<caption className="sr-only">Storage by type</caption>
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-2 pr-4" scope="col">Type</th>
                  <th className="pb-2 pr-4" scope="col">Files</th>
                  <th className="pb-2 pr-4" scope="col">Size</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.usage_by_type)
                  .sort(([, a], [, b]) => b.size_bytes - a.size_bytes)
                  .map(([type, stats]) => (
                    <tr key={type} className="border-b border-slate-100">
                      <td className="py-2 pr-4 font-medium capitalize">{type}</td>
                      <td className="py-2 pr-4">{stats.count.toLocaleString()}</td>
                      <td className="py-2 pr-4 font-mono">{formatBytes(stats.size_bytes)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Recent Uploads" subtitle="Last 20 files">
        {isLoading || error || !data ? null : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
<caption className="sr-only">Stored files</caption>
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-2 pr-4" scope="col">File</th>
                  <th className="pb-2 pr-4" scope="col">Type</th>
                  <th className="pb-2 pr-4" scope="col">Size</th>
                  <th className="pb-2 pr-4" scope="col">Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_uploads.map((u, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2 pr-4 font-mono text-xs truncate max-w-xs">{u.key}</td>
                    <td className="py-2 pr-4 capitalize">{u.type}</td>
                    <td className="py-2 pr-4 font-mono">{formatBytes(u.size)}</td>
                    <td className="py-2 pr-4 text-ink-muted">{new Date(u.uploaded_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}