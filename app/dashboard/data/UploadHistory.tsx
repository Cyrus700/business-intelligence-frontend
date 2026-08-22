"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Panel from "@/components/dashboard/Panel";
import Icon from "@/components/ui/Icon";
import { clsx } from "@/lib/cx";
import { getUploads, queryKeys } from "@/lib/api";
import type { UploadRecord } from "@/lib/api";
import { formatBytes, timeAgo } from "./format";

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
};

const PAGE_SIZE = 10;

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        STATUS_BADGE[status] ?? "bg-border text-ink-soft",
      )}
    >
      {status}
    </span>
  );
}

function ReportRow({ upload }: { upload: UploadRecord }) {
  const report = upload.error_report;
  if (!report) {
    return <div className="px-4 py-3 text-sm text-ink-muted">No report available.</div>;
  }
  const details = report.details ?? [];
  return (
    <div className="space-y-3 px-4 py-3">
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-lg bg-bg-soft px-2.5 py-1 text-ink-soft">
          <strong className="text-ink">{report.loaded ?? 0}</strong> loaded
        </span>
        <span className="rounded-lg bg-bg-soft px-2.5 py-1 text-ink-soft">
          <strong className="text-ink">{report.rejected ?? 0}</strong> rejected
        </span>
        <span className="rounded-lg bg-bg-soft px-2.5 py-1 text-ink-soft">
          <strong className="text-ink">{report.skipped_duplicates ?? 0}</strong> duplicates
        </span>
        {typeof report.file_size === "number" && (
          <span className="rounded-lg bg-bg-soft px-2.5 py-1 text-ink-soft">
            {formatBytes(report.file_size)}
          </span>
        )}
        {report.encoding && (
          <span className="rounded-lg bg-bg-soft px-2.5 py-1 font-mono text-ink-soft">
            {report.encoding}
          </span>
        )}
      </div>

      {(report.warnings ?? []).length > 0 && (
        <ul className="space-y-0.5 text-xs text-amber-700">
          {(report.warnings ?? []).map((w, i) => (
            <li key={i}>· {w}</li>
          ))}
        </ul>
      )}

      {(report.columns ?? []).length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Columns
          </span>
          {(report.columns ?? []).map((c) => (
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

      {(report.preview ?? []).length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer font-medium text-ink-soft">
            First rows preview
          </summary>
          <div className="mt-1 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left">
<caption className="sr-only">Upload history summary</caption>
<caption className="sr-only">Upload history summary</caption>
              <thead>
                <tr className="border-b border-border bg-bg-soft/60 text-ink-muted">
                  {(report.columns ?? []).map((c) => (
                    <th key={c} className="max-w-40 truncate px-2.5 py-1.5 font-semibold" scope="col">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {(report.preview ?? []).slice(0, 3).map((row, i) => (
                  <tr key={i}>
                    {(report.columns ?? []).map((c) => (
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
    </div>
  );
}

export default function UploadHistory({ canManage }: { canManage: boolean }) {
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.uploads.list(page),
    queryFn: () => getUploads({ page, page_size: PAGE_SIZE }),
    enabled: canManage,
  });

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

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <Panel
      title="Upload history"
      subtitle={
        data ? `${data.total} file${data.total === 1 ? "" : "s"} processed` : "Recent uploads"
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
  return (
    <>
      <tr className={clsx("hover:bg-bg-soft/50", open && "bg-bg-soft/40")}>
        <td className="max-w-56 truncate py-3 pl-5 pr-3 font-medium text-ink">{upload.file_name}</td>
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
        <td className="py-3 pr-3 text-ink-soft">
          {upload.row_count != null ? upload.row_count.toLocaleString() : "—"}
        </td>
        <td className="py-3 pr-3">
          <StatusBadge status={upload.status} />
        </td>
        <td className="py-3 pr-3 text-ink-soft">{timeAgo(upload.created_at)}</td>
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
