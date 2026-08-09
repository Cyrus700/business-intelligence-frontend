"use client";

import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Panel from "@/components/dashboard/Panel";
import Icon from "@/components/ui/Icon";
import { clsx } from "@/lib/cx";
import { queryKeys, uploadFile } from "@/lib/api";
import type { UploadRecord } from "@/lib/api";
import { formatBytes } from "./format";

const MAX_BYTES = 50 * 1024 * 1024;

const DOMAINS: Array<{ value: string; label: string; hint: string }> = [
  { value: "sales", label: "Sales", hint: "date · sku · quantity · unit_price" },
  { value: "finance", label: "Finance", hint: "date · category · amount" },
  { value: "inventory", label: "Inventory", hint: "date · sku · quantity_on_hand" },
];

const REQUIRED_COLUMNS: Record<string, string[]> = {
  sales: ["date", "sku", "quantity", "unit_price"],
  finance: ["date", "category", "amount"],
  inventory: ["date", "sku", "quantity_on_hand"],
};

const DOMAIN_LABEL: Record<string, string> = {
  sales: "Sales",
  finance: "Finance",
  inventory: "Inventory",
};

type CsvPreview = { headers: string[]; rows: string[][] };

function parseCsv(text: string, maxRows = 6): CsvPreview {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
      if (rows.length >= maxRows + 1) break;
    } else field += ch;
  }
  if (row.length && row.some((c) => c.trim() !== "")) rows.push(row);
  if (!rows.length) return { headers: [], rows: [] };
  return { headers: rows[0], rows: rows.slice(1) };
}

function ResultCard({ result, onReset }: { result: UploadRecord; onReset: () => void }) {
  const report = result.error_report;
  const details = report?.details ?? [];
  return (
    <div className="rounded-xl border border-green-200 bg-green-50/60 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-green-800">
            Loaded{" "}
            <span className="text-base font-bold">
              {(report?.loaded ?? result.row_count ?? 0).toLocaleString()}
            </span>{" "}
            rows into {DOMAIN_LABEL[result.target_domain ?? ""] ?? result.target_domain}
          </p>
          <p className="mt-1 text-xs text-green-700">
            {report?.rejected ? `${report.rejected} rows rejected` : "All rows passed validation"}
            {report?.skipped_duplicates
              ? ` · ${report.skipped_duplicates} duplicates skipped`
              : ""}
            {result.etl_job_id ? ` · ETL job ${result.etl_job_id.slice(0, 8)}…` : ""}
          </p>
          {(report?.warnings ?? []).length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs text-amber-700">
              {(report?.warnings ?? []).map((w, i) => (
                <li key={i}>· {w}</li>
              ))}
            </ul>
          )}
          {details.length > 0 && (
            <details className="mt-2 text-xs text-green-700">
              <summary className="cursor-pointer font-medium">
                View {details.length} rejected row(s)
              </summary>
              <ul className="mt-1 space-y-0.5">
                {details.slice(0, 10).map((d, i) => (
                  <li key={i}>
                    Row {d.row} — {d.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-green-300 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
        >
          Upload another
        </button>
      </div>
    </div>
  );
}

export default function UploadPanel({ canManage }: { canManage: boolean }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [domain, setDomain] = useState("sales");
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadRecord | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const missing = useMemo(() => {
    if (!preview || preview.headers.length === 0) return [];
    const normalized = preview.headers.map((h) => h.trim().toLowerCase());
    return (REQUIRED_COLUMNS[domain] ?? []).filter((c) => !normalized.includes(c));
  }, [preview, domain]);

  const isCsv = file?.name.toLowerCase().endsWith(".csv") ?? false;
  const blocked = uploading || !file || !!clientError || missing.length > 0;

  async function handleFile(next: File | null) {
    setFile(next);
    setResult(null);
    setServerError(null);
    setPreview(null);
    setClientError(null);
    if (!next) return;
    const name = next.name.toLowerCase();
    if (!/\.(csv|xlsx|xls)$/.test(name)) {
      setClientError("Unsupported file type — upload a .csv, .xlsx or .xls file.");
      return;
    }
    if (next.size > MAX_BYTES) {
      setClientError("File exceeds the 50 MB upload limit.");
      return;
    }
    if (next.size === 0) {
      setClientError("File is empty (0 bytes).");
      return;
    }
    if (name.endsWith(".csv")) {
      try {
        const text = await next.slice(0, 262_144).text();
        const parsed = parseCsv(text);
        if (!parsed.headers.length) {
          setClientError("Could not read this CSV — it appears to be empty.");
          return;
        }
        setPreview(parsed);
      } catch {
        setClientError("Could not read this file for preview.");
      }
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.files?.[0] ?? null;
    e.target.value = "";
    void handleFile(next);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    void handleFile(e.dataTransfer.files?.[0] ?? null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (blocked || !file) return;
    setUploading(true);
    setServerError(null);
    setResult(null);
    try {
      const res = await uploadFile(file, domain);
      setResult(res);
      setFile(null);
      setPreview(null);
      setClientError(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.uploads.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.etlJobs.all });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (!canManage) {
    return (
      <Panel title="Upload data" subtitle="Manager or Admin role required">
        <div className="flex flex-col items-center py-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-border/40 text-ink-muted">
            <Icon name="lock" className="h-6 w-6" />
          </span>
          <p className="mt-3 text-sm text-ink-soft">
            Uploading data files requires Manager or Admin role.
          </p>
          <p className="mt-1 text-xs text-ink-muted">Contact your admin to upgrade.</p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Upload data" subtitle="CSV or Excel — validated, transformed and loaded automatically">
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="rounded-xl border border-warn-200 bg-warn-50 px-4 py-3 text-sm text-warn">
            <span className="font-medium">Upload failed: </span>
            {serverError}
          </div>
        )}

        <div
          role="button"
          tabIndex={0}
          aria-label="Choose a CSV or Excel file to upload"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={clsx(
            "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors",
            dragOver
              ? "border-primary bg-primary-50/70"
              : "border-border bg-bg-soft/40 hover:border-primary/50 hover:bg-primary-50/30",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={onPick}
          />
          <span
            className={clsx(
              "flex h-12 w-12 items-center justify-center rounded-2xl transition-colors",
              dragOver ? "bg-primary text-white" : "bg-primary-50 text-primary",
            )}
          >
            <Icon name="table" className="h-6 w-6" />
          </span>
          <p className="mt-3 text-sm font-medium text-ink">
            {dragOver ? "Drop it here" : "Drag & drop your file, or "}
            {!dragOver && <span className="text-primary">browse</span>}
          </p>
          <p className="mt-1 text-xs text-ink-muted">CSV, XLSX or XLS · up to 50 MB</p>
        </div>

        {clientError && (
          <div className="rounded-xl border border-warn-200 bg-warn-50 px-4 py-3 text-sm text-warn">
            {clientError}
          </div>
        )}

        {file && (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-soft/50 px-3.5 py-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary">
              <Icon name="table" className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{file.name}</p>
              <p className="text-xs text-ink-muted">
                {formatBytes(file.size)} · {isCsv ? "CSV" : "Excel"}
                {!isCsv && " · preview only available for CSV"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleFile(null)}
              aria-label="Remove file"
              className="rounded-lg p-1.5 text-ink-muted hover:bg-border/50 hover:text-ink"
            >
              <Icon name="close" className="h-4 w-4" />
            </button>
          </div>
        )}

        {preview && missing.length > 0 && (
          <div className="rounded-xl border border-warn-200 bg-warn-50 px-4 py-3 text-sm text-warn">
            Missing required columns for {DOMAIN_LABEL[domain]}:{" "}
            <strong>{missing.join(", ")}</strong>. This file cannot be loaded for this domain.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">Target domain</span>
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
            >
              {DOMAINS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label} — {d.hint}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={blocked}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-white shadow-lift hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Loading into warehouse…
                </>
              ) : (
                <>
                  <Icon name="pipe" className="h-4 w-4" />
                  Validate & load
                </>
              )}
            </button>
          </div>
        </div>

        {preview && (
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-bg-soft/60 px-3.5 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Preview — first {Math.min(preview.rows.length, 5)} rows ·{" "}
                {file ? formatBytes(file.size) : ""}
              </span>
              <span className="mx-1 text-border">|</span>
              {preview.headers.map((h) => {
                const ok = !missing.includes(h.trim().toLowerCase());
                return (
                  <span
                    key={h}
                    className={clsx(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px]",
                      ok ? "bg-green-100 text-green-700" : "bg-warn-50 text-warn",
                    )}
                  >
                    {ok ? "✓" : "✗"} {h.trim()}
                  </span>
                );
              })}
            </div>
            <div className="max-h-56 overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-border text-ink-muted">
                    {preview.headers.map((h) => (
                      <th key={h} className="max-w-44 truncate px-3.5 py-2 font-semibold">
                        {h.trim()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {preview.rows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="hover:bg-bg-soft/50">
                      {preview.headers.map((h, j) => (
                        <td key={h} className="max-w-44 truncate px-3.5 py-2 text-ink-soft">
                          {r[j] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {preview.rows.length > 5 && (
                    <tr>
                      <td
                        colSpan={preview.headers.length}
                        className="px-3.5 py-2 text-center text-ink-muted"
                      >
                        + {preview.rows.length - 5} more rows in preview window
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {result && <ResultCard result={result} onReset={() => setResult(null)} />}
      </form>
    </Panel>
  );
}
