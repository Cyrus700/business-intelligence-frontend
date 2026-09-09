"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Panel from "@/components/dashboard/Panel";
import Icon from "@/components/ui/Icon";
import { clsx } from "@/lib/cx";
import { getUploads, queryKeys } from "@/lib/api";
import type { UploadRecord } from "@/lib/api";
import { formatBytes, formatDateTime, timeAgo } from "./format";

const DOMAIN_BADGE: Record<string, string> = {
  sales: "bg-primary-50 text-primary",
  finance: "bg-purple-50 text-purple-700",
  inventory: "bg-amber-50 text-amber-700",
};

const STATUS_BADGE: Record<string, string> = {
  loaded: "bg-green-100 text-green-700",
  validated: "bg-blue-100 text-blue-700",
  received: "bg-primary-50 text-primary",
  failed: "bg-warn-50 text-warn",
  processing: "bg-blue-100 text-blue-700",
};

const PAGE_SIZE = 10;

function StatusBadge({ status }: { status: string }) {
  const normalized = status === "received" ? "received" : status;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        STATUS_BADGE[normalized] ?? "bg-border text-ink-soft",
      )}
    >
      {normalized === "received" && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
      {normalized === "processing" && <span className="h-3 w-3 animate-spin rounded-full border border-blue-600/30 border-t-blue-600" />}
      {normalized}
    </span>
  );
}

function isProcessing(upload: UploadRecord): boolean {
  const r = upload.error_report as unknown as Record<string, unknown> | null;
  return upload.status === "received" && r?.status === "processing";
}

function hasProcessing(items: UploadRecord[] | undefined): boolean {
  if (!items) return false;
  return items.some(isProcessing);
}

function ReportRow({ upload }: { upload: UploadRecord }) {
  const report = upload.error_report as unknown as Record<string, unknown> | null;
  // Business-critical: surface real failure reason instead of silent 0/0
  const errorMsg = (report as unknown as { error?: string })?.error;

  if (isProcessing(upload)) {
    const fileSize = (report as unknown as { file_size?: number })?.file_size;
    return (
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-blue-700">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600/30 border-t-blue-600" />
          Processing — large file is being handled by Loader agent. Auto-refreshing…
        </div>
        {typeof fileSize === "number" && (
          <p className="mt-2 text-xs text-ink-muted">Size: {formatBytes(fileSize)} • Started {timeAgo(upload.created_at)} • <span title={formatDateTime(upload.created_at)} className="underline decoration-dotted">{formatDateTime(upload.created_at)}</span></p>
        )}
        {upload.updated_at && upload.updated_at !== upload.created_at && (
          <p className="mt-1 text-xs text-ink-muted">Last update: <span title={formatDateTime(upload.updated_at)}>{timeAgo(upload.updated_at)}</span></p>
        )}
      </div>
    );
  }
  if (errorMsg) {
    return (
      <div className="space-y-3 px-4 py-3">
        <div className="rounded-lg bg-warn-50 border border-warn-200 px-3 py-2 text-sm text-warn">
          <p className="font-medium">Upload failed</p>
          <p className="mt-1 text-xs opacity-90">{errorMsg}</p>
        </div>
        {(report as unknown as { warnings?: string[] })?.warnings && ((report as unknown as { warnings?: string[] }).warnings?.length ?? 0) > 0 && (
          <ul className="space-y-0.5 text-xs text-amber-700">
            {((report as unknown as { warnings?: string[] }).warnings ?? []).map((w, i) => (
              <li key={i}>· {w}</li>
            ))}
          </ul>
        )}
        <div className="text-xs text-ink-muted">
          <span title={formatDateTime(upload.created_at)}>Uploaded {timeAgo(upload.created_at)}</span>
          {upload.updated_at && upload.updated_at !== upload.created_at && (
            <> • Updated <span title={formatDateTime(upload.updated_at)}>{timeAgo(upload.updated_at)}</span></>
          )}
        </div>
      </div>
    );
  }
  if (!report) {
    return <div className="px-4 py-3 text-sm text-ink-muted">No report available.</div>;
  }
  const typed = report as unknown as { loaded?: number; rejected?: number; skipped_duplicates?: number; file_size?: number; encoding?: string; warnings?: string[]; columns?: string[]; details?: Array<{ row: number; reason: string }>; preview?: Array<Record<string, string>> };
  const details = typed.details ?? [];
  return (
    <div className="space-y-3 px-4 py-3">
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-lg bg-bg-soft px-2.5 py-1 text-ink-soft">
          <strong className="text-ink">{typed.loaded ?? 0}</strong> loaded
        </span>
        <span className="rounded-lg bg-bg-soft px-2.5 py-1 text-ink-soft">
          <strong className="text-ink">{typed.rejected ?? 0}</strong> rejected
        </span>
        <span className="rounded-lg bg-bg-soft px-2.5 py-1 text-ink-soft">
          <strong className="text-ink">{typed.skipped_duplicates ?? 0}</strong> duplicates
        </span>
        {typeof typed.file_size === "number" && (
          <span className="rounded-lg bg-bg-soft px-2.5 py-1 text-ink-soft">
            {formatBytes(typed.file_size)}
          </span>
        )}
        {typed.encoding && (
          <span className="rounded-lg bg-bg-soft px-2.5 py-1 font-mono text-ink-soft">
            {typed.encoding}
          </span>
        )}
        {upload.etl_job_id && (
          <span className="rounded-lg bg-green-50 px-2.5 py-1 font-mono text-xs text-green-700">
            job {upload.etl_job_id.slice(0, 8)}…
          </span>
        )}
      </div>

      {(typed.warnings ?? []).length > 0 && (
        <ul className="space-y-0.5 text-xs text-amber-700">
          {(typed.warnings ?? []).map((w, i) => (
            <li key={i}>· {w}</li>
          ))}
        </ul>
      )}

      {(typed.columns ?? []).length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Columns
          </span>
          {(typed.columns ?? []).map((c) => (
            <span
              key={c}
              className="rounded-full bg-border/40 px-2 py-0.5 font-mono text-[11px] text-ink-soft"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {details.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer font-medium text-ink-soft">
            Rejected rows ({details.length})
          </summary>
          <ul className="mt-1 max-h-40 space-y-0.5 overflow-auto rounded-lg bg-bg-soft/60 px-3 py-2 text-ink-soft">
            {details.map((d, i) => (
              <li key={i}>
                <span className="font-mono font-medium text-ink">Row {d.row}</span> — {d.reason}
              </li>
            ))}
          </ul>
        </details>
      )}

      {(typed.preview ?? []).length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer font-medium text-ink-soft">
            First rows preview
          </summary>
          <div className="mt-1 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left">
              <caption className="sr-only">Upload preview</caption>
              <thead>
                <tr className="border-b border-border bg-bg-soft/60 text-ink-muted">
                  {(typed.columns ?? []).map((c) => (
                    <th key={c} className="max-w-40 truncate px-2.5 py-1.5 font-semibold" scope="col">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {(typed.preview ?? []).slice(0, 3).map((row, i) => (
                  <tr key={i}>
                    {(typed.columns ?? []).map((c) => (
                      <td key={c} className="max-w-40 truncate px-2.5 py-1.5 text-ink-soft">
                        {row[c] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
      <div className="text-xs text-ink-muted">
        <span title={formatDateTime(upload.created_at)}>Uploaded {timeAgo(upload.created_at)} — {formatDateTime(upload.created_at)}</span>
        {upload.updated_at && upload.updated_at !== upload.created_at && (
          <> • Updated <span title={formatDateTime(upload.updated_at)}>{formatDateTime(upload.updated_at)}</span></>
        )}
        {upload.etl_job_id && <> • ETL {upload.etl_job_id.slice(0, 8)}</>}
      </div>
    </div>
  );
}

export default function UploadHistory({ canManage }: { canManage: boolean }) {
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  // Live tick for timeAgo — keeps "just now → 2m ago" moving without waiting for query refetch
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);
  // HistoryAgent: when a new file is uploaded on any page>1, jump to page 1 so the newest (ORDER BY created_at DESC) is visible
  useEffect(() => {
    const h = () => setPage(1);
    window.addEventListener("insightflow:uploads:created", h);
    return () => window.removeEventListener("insightflow:uploads:created", h);
  }, []);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: queryKeys.uploads.list({ page, page_size: PAGE_SIZE }),
    queryFn: () => getUploads({ page, page_size: PAGE_SIZE }),
    enabled: canManage,
    // TimestampAgent: poll while any upload is processing so history flips from received→loaded without manual refresh
    refetchInterval: (query) => {
      const items = (query.state.data as unknown as { items?: UploadRecord[] })?.items;
      return hasProcessing(items) ? 3000 : false;
    },
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  });

  // If a processing item finishes, the 3s poll will fetch updated status; also keep history live
  const isProcessingLive = hasProcessing(data?.items);

  if (!canManage) {
    return (
      <Panel title="Upload history" subtitle="Manager or Admin role required">
        <div className="flex flex-col items-center py-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-border/40 text-ink-muted">
            <Icon name="lock" className="h-6 w-6" />
          </span>
          <p className="mt-3 text-sm text-ink-soft">Upload history requires Manager or Admin role.</p>
        </div>
      </Panel>
    );
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <Panel
      title="Upload history"
      subtitle={
        data ? `${data.total} file${data.total === 1 ? "" : "s"} processed${isFetching ? " • refreshing…" : ""}${isProcessingLive ? " • live" : ""}` : "Recent uploads"
      }
      action={
        data && data.total > PAGE_SIZE ? (
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <span>
              Page {data.page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-border px-2 py-1 font-medium hover:bg-bg-soft disabled:opacity-40"
            >
              ←
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-border px-2 py-1 font-medium hover:bg-bg-soft disabled:opacity-40"
            >
              →
            </button>
          </div>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-sm text-ink-muted">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <span className="ml-2">Loading uploads…</span>
        </div>
      ) : error ? (
        <div className="rounded-xl bg-warn-50 px-4 py-3 text-sm text-warn">
          {error instanceof Error ? error.message : "Failed to load uploads"}
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="py-8 text-center text-sm text-ink-muted">
          No uploads yet — drop a CSV or Excel file above to get started.
        </div>
      ) : (
        <div className="-mx-5 -mb-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Upload logs</caption>
            <thead>
              <tr className="border-b border-border text-xs font-semibold uppercase text-ink-muted">
                <th className="py-3 pl-5 pr-3" scope="col">File</th>
                <th className="py-3 pr-3" scope="col">Domain</th>
                <th className="py-3 pr-3" scope="col">Rows</th>
                <th className="py-3 pr-3" scope="col">Status</th>
                <th className="py-3 pr-3" scope="col">Uploaded</th>
                <th className="py-3 pr-5 text-right" scope="col">Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {data.items.map((u) => (
                <FragmentRow
                  key={u.id}
                  upload={u}
                  open={openId === u.id}
                  onToggle={() => setOpenId(openId === u.id ? null : u.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function FragmentRow({
  upload,
  open,
  onToggle,
}: {
  upload: UploadRecord;
  open: boolean;
  onToggle: () => void;
}) {
  const processing = isProcessing(upload);
  // True wall-clock: show both relative + absolute with Kathmandu TZ tooltip
  const absolute = formatDateTime(upload.created_at);
  const relative = timeAgo(upload.created_at);
  const updatedAbsolute = upload.updated_at ? formatDateTime(upload.updated_at) : null;
  const hasUpdated = updatedAbsolute && upload.updated_at !== upload.created_at;
  // Row count while processing: show file_size hint instead of —
  const rowDisplay = upload.row_count != null ? upload.row_count.toLocaleString() : processing ? "…" : "—";
  const rowTitle = processing ? `File size ${(upload.error_report as unknown as { file_size?: number })?.file_size ? formatBytes((upload.error_report as unknown as { file_size?: number }).file_size as number) : ""} — counting rows…` : undefined;
  return (
    <>
      <tr className={clsx("hover:bg-bg-soft/50", open && "bg-bg-soft/40", processing && "bg-blue-50/30")}>
        <td className="max-w-56 truncate py-3 pl-5 pr-3 font-medium text-ink" title={upload.file_name}>{upload.file_name}</td>
        <td className="py-3 pr-3">
          <span
            className={clsx(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
              DOMAIN_BADGE[upload.target_domain ?? ""] ?? "bg-border text-ink-soft",
            )}
          >
            {upload.target_domain ?? "—"}
          </span>
        </td>
        <td className="py-3 pr-3 text-ink-soft" title={rowTitle ?? undefined}>
          {rowDisplay}
        </td>
        <td className="py-3 pr-3">
          <StatusBadge status={processing ? "processing" : upload.status} />
        </td>
        <td className="py-3 pr-3 text-ink-soft">
          <span title={absolute} className="underline decoration-dotted underline-offset-2 cursor-help">
            {relative}
          </span>
          <span className="ml-1 hidden text-[11px] text-ink-muted sm:inline" title={absolute}>
            • {absolute}
          </span>
          {hasUpdated && (
            <span className="ml-1 text-[11px] text-ink-muted" title={`Updated ${updatedAbsolute}`}>
              • upd {timeAgo(upload.updated_at as string)}
            </span>
          )}
        </td>
        <td className="py-3 pr-5 text-right">
          <button
            type="button"
            onClick={onToggle}
            aria-label="Toggle validation report"
            aria-expanded={open}
            className="rounded-lg p-1.5 text-ink-muted hover:bg-border/50 hover:text-ink"
          >
            <Icon name="arrow" className={clsx("h-4 w-4 transition-transform", open && "rotate-90")} />
          </button>
        </td>
      </tr>
      {open && (
        <tr className="border-t-0 bg-bg-soft/30">
          <td colSpan={6} className="border-t border-border/60">
            <ReportRow upload={upload} />
          </td>
        </tr>
      )}
    </>
  );
}
