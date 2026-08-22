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
const DOMAIN_LIMIT_ROWS = 200;

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

// Mirrors app.services.etl.domains.COLUMN_ALIASES — keep both in sync.
const COLUMN_ALIASES: Record<string, string[]> = {
  date: [
    "date",
    "txn_date",
    "transaction_date",
    "order_date",
    "sale_date",
    "expense_date",
    "snapshot_date",
    "entry_date",
  ],
  sku: ["sku", "item_sku", "item_code", "product_code", "product_id"],
  quantity: ["quantity", "qty", "quantity_sold", "qty_sold", "units", "units_sold"],
  unit_price: ["unit_price", "unitprice", "price", "selling_price", "retail_price"],
  category: ["category", "category_name", "expense_category"],
  amount: ["amount", "expense_amount", "transaction_amount", "value"],
  quantity_on_hand: [
    "quantity_on_hand",
    "qty_on_hand",
    "on_hand",
    "on_hand_qty",
    "current_stock",
    "stock_qty",
    "stock",
  ],
};

const ALIAS_LOOKUP = new Map<string, string>();

for (const [canonical, names] of Object.entries(COLUMN_ALIASES)) {
  ALIAS_LOOKUP.set(canonical, canonical);
  for (const name of names) ALIAS_LOOKUP.set(name, canonical);
}

type ResolvedHeaders = {
  /** canonical column name -> original header as shown in the file */
  canonical: Map<string, string>;
  /** canonical names that came from more than one source column */
  conflicts: string[];
  /** canonical name -> list of original headers (first is preferred) */
  byCanonical: Map<string, string[]>;
};

function resolveHeaders(headers: string[]): ResolvedHeaders {
  const normalize = (name: string) => name.trim().toLowerCase().replace(/\s+/g, "_");
  const byCanonical = new Map<string, string[]>();
  for (const h of headers) {
    const canon = ALIAS_LOOKUP.get(normalize(h)) ?? normalize(h);
    const list = byCanonical.get(canon) ?? [];
    if (!list.includes(h.trim())) list.push(h.trim());
    byCanonical.set(canon, list);
  }
  const canonical = new Map<string, string>();
  for (const [canon, list] of byCanonical) canonical.set(canon, list[0]);
  const conflicts = [...byCanonical]
    .filter(([, list]) => list.length > 1)
    .map(([canon]) => canon);
  return { canonical, conflicts, byCanonical };
}

function matchScore(domain: string, canonical: Map<string, string>): number {
  return (REQUIRED_COLUMNS[domain] ?? []).filter((c) => canonical.has(c)).length;
}

function bestDomain(canonical: Map<string, string>): { value: string; matched: number; total: number } | null {
  let best: { value: string; matched: number; total: number } | null = null;
  for (const d of DOMAINS) {
    const matched = matchScore(d.value, canonical);
    if (matched === 0) continue;
    const total = REQUIRED_COLUMNS[d.value].length;
    if (!best || matched > best.matched) best = { value: d.value, matched, total };
  }
  if (!best) return null;
  const tied = DOMAINS.filter((d) => matchScore(d.value, canonical) === best!.matched).length > 1;
  return tied ? null : best;
}

type CsvPreview = { headers: string[]; rows: string[][] };

function parseCsv(text: string, maxRows = DOMAIN_LIMIT_ROWS): CsvPreview {
  let src = text;
  if (src.charCodeAt(0) === 0xfeff) src = src.slice(1); // strip UTF-8 BOM
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
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
      if (ch === "\r" && src[i + 1] === "\n") i++;
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

async function parseXlsx(file: File, maxRows = DOMAIN_LIMIT_ROWS): Promise<CsvPreview> {
  const buf = await file.arrayBuffer();
  const { read, utils } = await import("xlsx");
  const wb = read(buf, { type: "array", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return { headers: [], rows: [] };
  const raw = utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: true });
  if (!raw.length) return { headers: [], rows: [] };
  const [head, ...body] = raw;
  const headers = (head ?? []).map((h) => String(h ?? "").trim());
  const rows = body
    .filter((r) => r.some((c) => String(c ?? "").trim() !== ""))
    .slice(0, maxRows)
    .map((r) => r.map(cellToText));
  return { headers, rows };
}

function cellToText(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string") return value;
  return String(value);
}

type RowIssue = { row: number; reason: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}(?:[T ].*)?$/;

function spotCheck(
  headers: string[],
  rows: string[][],
  resolved: ResolvedHeaders,
  domain: string,
): RowIssue[] {
  const indexOf = (canon: string) => {
    const original = resolved.canonical.get(canon);
    if (original == null) return -1;
    return headers.findIndex((h) => h.trim() === original);
  };
  const issues: RowIssue[] = [];
  const check = (col: string, test: (v: string) => string | null) => {
    const i = indexOf(col);
    if (i === -1) return;
    rows.forEach((r, rowIdx) => {
      const v = (r[i] ?? "").trim();
      if (!v) return;
      const problem = test(v);
      if (problem) issues.push({ row: rowIdx + 1, reason: `${col}: ${problem}` });
    });
  };

  check("date", (v) => (DATE_RE.test(v) ? null : `"${v}" is not a valid date (use YYYY-MM-DD)`));
  if (domain === "sales") {
    check("quantity", (v) => {
      const n = Number(v);
      return Number.isInteger(n) && n >= 1 ? null : `"${v}" is not a whole number ≥ 1`;
    });
    check("unit_price", (v) => {
      const n = Number(v);
      return !Number.isNaN(n) && n >= 0 ? null : `"${v}" is not a number ≥ 0`;
    });
    check("discount", (v) => {
      const n = Number(v);
      return !Number.isNaN(n) && n >= 0 ? null : `"${v}" is not a number ≥ 0`;
    });
  }
  if (domain === "finance") {
    check("amount", (v) => {
      const n = Number(v);
      return !Number.isNaN(n) && n > 0 ? null : `"${v}" is not a number > 0`;
    });
  }
  if (domain === "inventory") {
    check("quantity_on_hand", (v) => {
      const n = Number(v);
      return Number.isInteger(n) && n >= 0 ? null : `"${v}" is not a whole number ≥ 0`;
    });
  }
  return issues.slice(0, 10);
}

function SampleStrip() {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-bg-soft/40 px-3.5 py-2.5">
      <span className="text-xs font-semibold text-ink-muted">
        Need a template? Download a ready-to-upload sample:
      </span>
      {DOMAINS.map((d) => (
        <a
          key={d.value}
          href={`/samples/${d.value}-sample.xlsx`}
          download
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary-50/60 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary-50 hover:ring-2 hover:ring-primary/20"
        >
          <Icon name="download" className="h-3.5 w-3.5" />
          {d.label} .xlsx
        </a>
      ))}
      <span className="ml-auto hidden text-[11px] text-ink-muted sm:block">
        Pick the matching domain below, then upload — no edits needed.
      </span>
    </div>
  );
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
                {details.length > 10 && <li>+ {details.length - 10} more…</li>}
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
  const [bestMatchApplied, setBestMatchApplied] = useState<{
    value: string;
    matched: number;
    total: number;
  } | null>(null);

  const resolved = useMemo(() => (preview ? resolveHeaders(preview.headers) : null), [preview]);

  const missing = useMemo(() => {
    if (!resolved) return [];
    return (REQUIRED_COLUMNS[domain] ?? []).filter((c) => !resolved.canonical.has(c));
  }, [resolved, domain]);

  const rowIssues = useMemo(
    () =>
      preview && resolved && missing.length === 0
        ? spotCheck(preview.headers, preview.rows, resolved, domain)
        : [],
    [preview, resolved, missing.length, domain],
  );

  const aliasesUsed = useMemo(() => {
    if (!resolved) return [];
    const out: string[] = [];
    for (const [canon, list] of resolved.byCanonical) {
      if (list.length === 1 && list[0].trim().toLowerCase() !== canon) out.push(`${list[0]} → ${canon}`);
    }
    return out;
  }, [resolved]);

  const autoNote = useMemo(() => {
    if (!resolved || bestMatchApplied == null) return null;
    if (bestMatchApplied.matched === bestMatchApplied.total)
      return `Detected ${DOMAIN_LABEL[bestMatchApplied.value]} — all ${bestMatchApplied.total} required columns matched, selected automatically.`;
    return `Auto-selected ${DOMAIN_LABEL[bestMatchApplied.value]} (${bestMatchApplied.matched}/${bestMatchApplied.total} columns matched).`;
  }, [resolved, bestMatchApplied]);

  const isCsv = file?.name.toLowerCase().endsWith(".csv") ?? false;
  const blocked = uploading || !file || !!clientError || missing.length > 0;

  async function handleFile(next: File | null) {
    setFile(next);
    setResult(null);
    setServerError(null);
    setPreview(null);
    setClientError(null);
    setBestMatchApplied(null);
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
    try {
      const parsed = name.endsWith(".csv")
        ? parseCsv(await next.slice(0, 262_144).text())
        : await parseXlsx(next);
      if (!parsed.headers.length) {
        setClientError(
          name.endsWith(".csv")
            ? "Could not read this CSV — it appears to be empty."
            : "Could not read this Excel workbook — it appears to be empty.",
        );
        return;
      }
      setPreview(parsed);
      const best = bestDomain(resolveHeaders(parsed.headers).canonical);
      if (best && best.value !== domain) {
        setDomain(best.value);
        setBestMatchApplied(best);
      } else if (best) {
        setBestMatchApplied(best);
      }
    } catch {
      setClientError(
        name.endsWith(".csv")
          ? "Could not read this CSV for preview — is it corrupted?"
          : "Could not read this Excel workbook — it may be corrupted or password-protected.",
      );
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

        <SampleStrip />

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
          <p className="mt-1 text-xs text-ink-muted">CSV, XLSX or XLS · up to 50 MB · first sheet used</p>
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
                {!preview && " · preview not available"}
                {preview && ` · ${preview.rows.length} rows in preview`}
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

        {preview && autoNote && (
          <div className="rounded-xl border border-green-200 bg-green-50/70 px-4 py-3 text-sm text-green-800">
            {autoNote}
          </div>
        )}

        {preview && resolved && resolved.conflicts.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span className="font-medium">Column conflicts:</span> the file has multiple columns
            that map to the same name —{" "}
            <strong>
              {resolved.conflicts
                .map((c) => `${c} (${resolved.byCanonical.get(c)?.join(", ")})`)
                .join("; ")}
            </strong>
            . The server will reject this file; remove or rename the duplicates first.
          </div>
        )}

        {preview && resolved && missing.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p>
              <span className="font-medium">This file doesn&apos;t match {DOMAIN_LABEL[domain]}.</span>{" "}
              {DOMAIN_LABEL[domain]} needs{" "}
              <strong>{REQUIRED_COLUMNS[domain].join(", ")}</strong> — missing{" "}
              <strong>{missing.join(", ")}</strong>.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-amber-900/70">Which format is your file?</span>
              {DOMAINS.map((d) => {
                const matched = matchScore(d.value, resolved.canonical);
                const total = REQUIRED_COLUMNS[d.value].length;
                const ready = matched === total;
                const isCurrent = d.value === domain;
                return (
                  <button
                    key={d.value}
                    type="button"
                    disabled={!ready || isCurrent}
                    onClick={() => setDomain(d.value)}
                    className={clsx(
                      "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                      ready && !isCurrent
                        ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                        : isCurrent
                          ? "border-primary bg-primary-50 text-primary"
                          : "border-border bg-white text-ink-muted",
                    )}
                  >
                    {d.label}: {ready ? "✓ ready" : `${matched}/${total}`}
                  </button>
                );
              })}
            </div>
            {aliasesUsed.length > 0 && (
              <p className="mt-2 text-xs text-amber-800/80">
                Column names are matched flexibly (e.g. {aliasesUsed.slice(0, 3).join(", ")}
                {aliasesUsed.length > 3 ? `, +${aliasesUsed.length - 3} more` : ""}).
              </p>
            )}
            <p className="mt-1.5 text-xs text-amber-800/80">
              Or download the matching sample above and copy its column names exactly.
            </p>
          </div>
        )}

        {preview && missing.length === 0 && rowIssues.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <span className="font-medium">Spot-check on preview rows:</span> some values may be
            rejected during validation:
            <ul className="mt-1 space-y-0.5 text-xs">
              {rowIssues.map((it, i) => (
                <li key={i}>
                  Row {it.row} — {it.reason}
                </li>
              ))}
            </ul>
            <p className="mt-1 text-xs">The full file is validated server-side; rejected rows are
            skipped and reported after upload.</p>
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
                  {d.label} — required: {d.hint}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={blocked}
              title={
                missing.length > 0
                  ? `Missing columns: ${missing.join(", ")}`
                  : !file
                    ? "Choose a file to upload"
                    : undefined
              }
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
                const key = h.trim().toLowerCase().replace(/\s+/g, "_");
                const canon = ALIAS_LOOKUP.get(key) ?? key;
                const isRequired = (REQUIRED_COLUMNS[domain] ?? []).includes(canon);
                const ok = !isRequired || !missing.includes(canon);
                const aliased = canon !== key && ALIAS_LOOKUP.has(key);
                return (
                  <span
                    key={h}
                    title={aliased ? `Shown as: ${canon}` : undefined}
                    className={clsx(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px]",
                      ok ? "bg-green-100 text-green-700" : "bg-warn-50 text-warn",
                    )}
                  >
                    {ok ? "✓" : "✗"} {h.trim()}
                    {aliased && <span className="text-green-600/70">→{canon}</span>}
                  </span>
                );
              })}
            </div>
            <div className="max-h-56 overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-border text-ink-muted">
                    {preview.headers.map((h) => (
                      <th key={h} className="max-w-44 truncate px-3.5 py-2 font-semibold" scope="col">
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