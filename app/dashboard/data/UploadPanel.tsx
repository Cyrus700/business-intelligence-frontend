"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Panel from "@/components/dashboard/Panel";
import Icon from "@/components/ui/Icon";
import { clsx } from "@/lib/cx";
import { ApiError, inspectFile, queryKeys, uploadFile } from "@/lib/api";
import type { InspectResult, UploadRecord } from "@/lib/api";
import { formatBytes } from "./format";

const MAX_BYTES = 50 * 1024 * 1024;
const CHUNK_THRESHOLD = 5 * 1024 * 1024;

const DOMAINS: Array<{ value: string; label: string; hint: string; icon: string }> = [
  { value: "sales", label: "Sales", hint: "date · sku · quantity · unit_price", icon: "trend" },
  { value: "finance", label: "Finance", hint: "date · category · amount", icon: "chart" },
  { value: "inventory", label: "Inventory", hint: "date · sku · quantity_on_hand", icon: "grid" },
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

type AgentState = "idle" | "running" | "done" | "error";

type AgentStep = {
  key: string;
  label: string;
  desc: string;
  icon: string;
  state: AgentState;
};

function agentStepsFor(progress: number, uploading: boolean, error: string | null, done: boolean): AgentStep[] {
  if (!uploading && !done && !error) {
    return [
      { key: "inspect", label: "Inspector", desc: "Detects file type & columns", icon: "search", state: "idle" },
      { key: "validate", label: "Validator", desc: "Checks required fields", icon: "check", state: "idle" },
      { key: "transform", label: "Transformer", desc: "Cleans & normalizes", icon: "spark", state: "idle" },
      { key: "load", label: "Loader", desc: "Writes to warehouse", icon: "pipe", state: "idle" },
    ];
  }
  if (error) {
    return [
      { key: "inspect", label: "Inspector", desc: "File understood", icon: "search", state: "done" },
      { key: "validate", label: "Validator", desc: "Issue found", icon: "check", state: "error" },
      { key: "transform", label: "Transformer", desc: "Paused", icon: "spark", state: "idle" },
      { key: "load", label: "Loader", desc: "Paused", icon: "pipe", state: "idle" },
    ];
  }
  if (done) {
    return [
      { key: "inspect", label: "Inspector", desc: "File understood", icon: "search", state: "done" },
      { key: "validate", label: "Validator", desc: "Validated", icon: "check", state: "done" },
      { key: "transform", label: "Transformer", desc: "Transformed", icon: "spark", state: "done" },
      { key: "load", label: "Loader", desc: "Loaded", icon: "pipe", state: "done" },
    ];
  }
  // uploading
  const pct = progress;
  return [
    { key: "inspect", label: "Inspector", desc: pct >= 5 ? "File understood" : "Reading file…", icon: "search", state: pct >= 5 ? "done" : "running" },
    { key: "validate", label: "Validator", desc: pct >= 20 ? "Schema checked" : pct >= 5 ? "Validating…" : "Queued", icon: "check", state: pct >= 20 ? "done" : pct >= 5 ? "running" : "idle" },
    { key: "transform", label: "Transformer", desc: pct >= 60 ? "Normalized" : pct >= 20 ? "Transforming…" : "Queued", icon: "spark", state: pct >= 60 ? "done" : pct >= 20 ? "running" : "idle" },
    { key: "load", label: "Loader", desc: pct >= 90 ? "Writing…" : pct >= 60 ? "Loading…" : "Queued", icon: "pipe", state: pct >= 100 ? "done" : pct >= 60 ? "running" : "idle" },
  ];
}

function SampleStrip() {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-bg-soft/40 px-3.5 py-2.5">
      <span className="text-xs font-semibold text-ink-muted">Need a template? Download a ready-to-upload sample:</span>
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
      <span className="ml-auto hidden text-[11px] text-ink-muted sm:block">Pick the matching domain below, then upload — no edits needed.</span>
    </div>
  );
}

function AgentPipeline({ progress, uploading, error, done }: { progress: number; uploading: boolean; error: string | null; done: boolean }) {
  const steps = agentStepsFor(progress, uploading, error, done);
  return (
    <div className="rounded-xl border border-border bg-white px-3 py-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Pipeline agents</span>
        {uploading && <span className="ml-auto text-xs text-primary animate-pulse">Working… {progress}%</span>}
        {done && <span className="ml-auto text-xs font-medium text-green-600">Complete</span>}
        {error && <span className="ml-auto text-xs font-medium text-warn">Needs attention</span>}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {steps.map((s, idx) => (
          <div key={s.key} className="relative">
            <div
              className={clsx(
                "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-all",
                s.state === "running" && "border-primary bg-primary-50/50 shadow-sm",
                s.state === "done" && "border-green-200 bg-green-50/60",
                s.state === "error" && "border-warn-200 bg-warn-50",
                s.state === "idle" && "border-border bg-bg-soft/30"
              )}
            >
              <span
                className={clsx(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs",
                  s.state === "running" && "bg-primary text-white animate-pulse",
                  s.state === "done" && "bg-green-600 text-white",
                  s.state === "error" && "bg-warn text-white",
                  s.state === "idle" && "bg-border text-ink-muted"
                )}
              >
                {s.state === "running" ? (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : s.state === "done" ? (
                  "✓"
                ) : s.state === "error" ? (
                  "!"
                ) : (
                  <Icon name={s.icon as any} className="h-4 w-4" />
                )}
              </span>
              <span className="text-xs font-semibold text-ink">{s.label}</span>
              <span className="text-[11px] leading-tight text-ink-muted">{s.desc}</span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={clsx(
                  "absolute top-6 hidden h-0.5 w-2 -translate-y-1/2 sm:block",
                  "left-[calc(100%_-_4px)] right-[-8px]",
                  s.state === "done" ? "bg-green-300" : s.state === "running" ? "bg-primary/40" : "bg-border"
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FileBadge({ file, inspect }: { file: File; inspect: InspectResult | null }) {
  const isCsv = file.name.toLowerCase().endsWith(".csv");
  const large = file.size > CHUNK_THRESHOLD;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-soft/50 px-3.5 py-3">
      <span className={clsx("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", isCsv ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600")}>
        <Icon name={isCsv ? "table" : "grid"} className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-ink">{file.name}</p>
          <span className={clsx("rounded-full px-2 py-0.5 text-[11px] font-medium", isCsv ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700")}>
            {inspect?.kind?.toUpperCase() ?? (isCsv ? "CSV" : "EXCEL")}
          </span>
          {inspect?.encoding && inspect.encoding !== "utf-8" && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-700">{inspect.encoding}</span>}
          {large && <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary">Chunked • {Math.ceil(file.size / (1024 * 1024))} parts</span>}
        </div>
        <p className="mt-0.5 flex flex-wrap gap-2 text-xs text-ink-muted">
          <span>{formatBytes(file.size)}</span>
          <span>•</span>
          <span>{inspect ? `${inspect.row_estimate} rows detected` : "inspecting…"}</span>
          {inspect?.sheet_name && (
            <>
              <span>•</span>
              <span>Sheet: {inspect.sheet_name}</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function ResultCard({ result, onReset }: { result: UploadRecord; onReset: () => void }) {
  const report = result.error_report;
  const details = (report as any)?.details ?? [];
  const isProcessing = (report as any)?.status === "processing";
  if (isProcessing) {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600/30 border-t-blue-600" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-900">Processing in background</p>
            <p className="mt-1 text-xs text-blue-800">Your file was accepted ({((report as any)?.file_size ? formatBytes((report as any).file_size) : "")}). Large files are handled by a dedicated Loader agent — this usually takes 10–30s. Check history below; it will update automatically.</p>
          </div>
          <button type="button" onClick={onReset} className="rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100">
            Upload another
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-green-200 bg-green-50/60 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-green-800">
            Loaded <span className="text-base font-bold">{((report as any)?.loaded ?? result.row_count ?? 0).toLocaleString()}</span> rows into {DOMAIN_LABEL[result.target_domain ?? ""] ?? result.target_domain}
          </p>
          <p className="mt-1 text-xs text-green-700">
            {(report as any)?.rejected ? `${(report as any).rejected} rows rejected` : "All rows passed validation"}
            {(report as any)?.skipped_duplicates ? ` · ${(report as any).skipped_duplicates} duplicates skipped` : ""}
            {result.etl_job_id ? ` · ETL job ${result.etl_job_id.slice(0, 8)}…` : ""}
          </p>
          {((report as any)?.warnings ?? []).length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs text-amber-700">
              {((report as any).warnings ?? []).map((w: string, i: number) => (
                <li key={i}>· {w}</li>
              ))}
            </ul>
          )}
          {details.length > 0 && (
            <details className="mt-2 text-xs text-green-700">
              <summary className="cursor-pointer font-medium">View {details.length} rejected row(s)</summary>
              <ul className="mt-1 space-y-0.5">
                {details.slice(0, 10).map((d: any, i: number) => (
                  <li key={i}>
                    Row {d.row} — {d.reason}
                  </li>
                ))}
                {details.length > 10 && <li>+ {details.length - 10} more…</li>}
              </ul>
            </details>
          )}
        </div>
        <button type="button" onClick={onReset} className="rounded-lg border border-green-300 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100">
          Upload another
        </button>
      </div>
    </div>
  );
}

export default function UploadPanel({ canManage }: { canManage: boolean }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [domain, setDomain] = useState<string>("sales");
  const [inspect, setInspect] = useState<InspectResult | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadRecord | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [autoNote, setAutoNote] = useState<string | null>(null);

  const missing = useMemo(() => {
    if (!inspect) return [];
    const key = domain as string;
    return (REQUIRED_COLUMNS[key] ?? []).filter((c) => !inspect.canonical_columns.includes(c));
  }, [inspect, domain]);

  const blocked = uploading || !file || !!clientError || (inspect ? missing.length > 0 : false);

  // Auto-inspect whenever file changes
  useEffect(() => {
    if (!file) {
      setInspect(null);
      setInspecting(false);
      setAutoNote(null);
      return;
    }
    let cancelled = false;
    setInspecting(true);
    setClientError(null);
    setServerError(null);
    setAutoNote(null);
    // Business-easy: backend agents explain the file in plain English
    inspectFile(file)
      .then((res) => {
        if (cancelled) return;
        setInspect(res);
        setInspecting(false);
        // Prefer business_summary from the multi-agent backend, fallback to old confidence text
        const busSummary = (res as unknown as { business_summary?: string }).business_summary;
        const intel = (res as unknown as { intel?: { headline: string; body: string } }).intel;
        const sug = res.detected?.suggested;
        const conf = res.detected?.confidence ?? 0;
        const headline = intel?.headline || busSummary;
        if (headline) {
          // Use business-friendly headline from DomainIntelligenceAgent
          if (sug && conf >= 0.6) {
            setDomain((prev) => {
              if (prev !== sug) {
                setAutoNote(`${headline} — ${intel?.body ?? ""} Auto-selected. You can change below.`.trim());
                return sug;
              }
              setAutoNote(`${headline} — ${intel?.body ?? ""}`.trim());
              return prev;
            });
          } else {
            setAutoNote(`${headline} — ${intel?.body ?? ""}`.trim());
          }
        } else if (sug && conf >= 0.6) {
          setDomain((prev) => {
            if (prev !== sug) {
              const label = DOMAIN_LABEL[sug] ?? sug;
              setAutoNote(`Auto-detected as ${label} (${Math.round(conf * 100)}% match) — selected automatically. You can change it below.`);
              return sug;
            }
            setAutoNote(`Detected as ${DOMAIN_LABEL[sug] ?? sug} (${Math.round(conf * 100)}% match).`);
            return prev;
          });
        } else if (sug && conf < 0.6) {
          setAutoNote(`Looks like ${DOMAIN_LABEL[sug] ?? sug} (${Math.round(conf * 100)}% match) — please confirm the domain below.`);
        } else {
          setAutoNote("Could not confidently detect domain — please select the correct one below.");
        }
        // Surface quality hints in console for business ease (also shown in column section)
        if ((res as unknown as { quality_hints?: string[] }).quality_hints?.length) {
          console.debug("Quality hints:", (res as unknown as { quality_hints?: string[] }).quality_hints);
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setInspect(null);
        setInspecting(false);
        const msg = e instanceof ApiError ? e.message : String(e);
        // Non-fatal: keep client-side validation as fallback
        setAutoNote(`Inspector unavailable: ${msg} — using browser-side check.`);
      });
    return () => {
      cancelled = true;
    };
  }, [file]);

  async function handleFile(next: File | null) {
    // cancel any in-flight upload
    abortRef.current?.abort();
    abortRef.current = null;
    setProgress(0);
    setFile(next);
    setResult(null);
    setServerError(null);
    setClientError(null);
    setInspect(null);
    setAutoNote(null);
    if (!next) return;
    const name = next.name.toLowerCase();
    if (!/\.(csv|xlsx|xls)$/.test(name)) {
      setClientError("Unsupported file type — upload a .csv, .xlsx or .xls file. Check the extension and try again.");
      return;
    }
    if (next.size > MAX_BYTES) {
      setClientError(`File is ${formatBytes(next.size)} — exceeds the 50 MB limit. For larger datasets, split the file or contact your admin.`);
      return;
    }
    if (next.size === 0) {
      setClientError("File is empty (0 bytes).");
      return;
    }
    // inspection happens via effect
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
    setProgress(5);
    setServerError(null);
    setResult(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await uploadFile(file, domain, undefined, (pct) => setProgress(pct), controller.signal);
      setProgress(100);
      setResult(res);
      setFile(null);
      setInspect(null);
      setClientError(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.uploads.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.etlJobs.all });
      // slight delay to let user see 100%
      setTimeout(() => setProgress(0), 600);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Upload failed";
      // Provide actionable guidance for common cases
      let friendly = msg;
      if (msg.includes("Failed to fetch") || msg.includes("Network error") || msg.includes("Cannot reach server")) {
        friendly = "Cannot reach server — please check your connection and try again. If this persists, the server may be restarting; wait 30s and retry. Your file was not lost — just re-drop it.";
      } else if (msg.toLowerCase().includes("missing required columns")) {
        friendly = msg + " — the Inspector shows which columns are missing below. Fix headers or switch domain.";
      } else if (msg.includes("413") || msg.toLowerCase().includes("exceeds")) {
        friendly = "File too large for a single upload. It will be split into chunks automatically — just retry. If it still fails, split the file into <5 MB parts.";
      }
      setServerError(friendly);
      setProgress(0);
    } finally {
      setUploading(false);
      abortRef.current = null;
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
    setUploading(false);
    setProgress(0);
  }

  function handleReset() {
    abortRef.current?.abort();
    setFile(null);
    setInspect(null);
    setResult(null);
    setServerError(null);
    setClientError(null);
    setProgress(0);
    setAutoNote(null);
  }

  if (!canManage) {
    return (
      <Panel title="Upload data" subtitle="Manager or Admin role required">
        <div className="flex flex-col items-center py-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-border/40 text-ink-muted">
            <Icon name="lock" className="h-6 w-6" />
          </span>
          <p className="mt-3 text-sm text-ink-soft">Uploading data files requires Manager or Admin role.</p>
          <p className="mt-1 text-xs text-ink-muted">Contact your admin to upgrade.</p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Upload data" subtitle="Smart upload — file type & domain detected automatically">
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="rounded-xl border border-warn-200 bg-warn-50 px-4 py-3 text-sm text-warn">
            <div className="flex gap-2">
              <span className="font-medium">Upload failed:</span>
              <span className="flex-1">{serverError}</span>
              <button type="button" onClick={() => setServerError(null)} className="shrink-0 rounded p-1 hover:bg-warn-100">
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <SampleStrip />

        {/* Drop zone */}
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
            dragOver ? "border-primary bg-primary-50/70" : "border-border bg-bg-soft/40 hover:border-primary/50 hover:bg-primary-50/30"
          )}
        >
          <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onPick} />
          <span className={clsx("flex h-12 w-12 items-center justify-center rounded-2xl transition-colors", dragOver ? "bg-primary text-white" : "bg-primary-50 text-primary")}>
            <Icon name="table" className="h-6 w-6" />
          </span>
          <p className="mt-3 text-sm font-medium text-ink">
            {dragOver ? "Drop it here" : "Drag & drop your file, or "}
            {!dragOver && <span className="text-primary">browse</span>}
          </p>
          <p className="mt-1 text-xs text-ink-muted">CSV, XLSX or XLS · up to 50 MB · first sheet used · auto-detected</p>
          <p className="mt-1 text-[11px] text-ink-muted">Small files load instantly · large files stream in chunks with progress</p>
        </div>

        {clientError && <div className="rounded-xl border border-warn-200 bg-warn-50 px-4 py-3 text-sm text-warn">{clientError}</div>}

        {/* File + inspector badge */}
        {file && (
          <div className="space-y-3">
            {inspecting ? (
              <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary-50/30 px-4 py-3 text-sm text-primary">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                Inspector is reading your file…
              </div>
            ) : inspect ? (
              <FileBadge file={file} inspect={inspect} />
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-soft/50 px-3.5 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary">
                  <Icon name="table" className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{file.name}</p>
                  <p className="text-xs text-ink-muted">{formatBytes(file.size)} • awaiting inspection</p>
                </div>
                <button type="button" onClick={handleReset} aria-label="Remove file" className="rounded-lg p-1.5 text-ink-muted hover:bg-border/50 hover:text-ink">
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </div>
            )}

            {file && !inspecting && (
              <div className="flex items-center justify-between">
                <div className="text-xs text-ink-muted">
                  {inspect ? (
                    <>
                      Columns: <span className="font-medium text-ink">{inspect.columns.length}</span> • Rows: <span className="font-medium text-ink">{inspect.row_estimate}</span> • Kind: <span className="font-medium text-ink">{inspect.kind}</span>
                    </>
                  ) : (
                    <span>{formatBytes(file.size)} ready</span>
                  )}
                </div>
                <button type="button" onClick={handleReset} className="text-xs font-medium text-ink-muted hover:text-ink">
                  Change file
                </button>
              </div>
            )}
          </div>
        )}

        {autoNote && (
          <div className={clsx("rounded-xl border px-4 py-3 text-sm", inspect?.detected?.suggested && inspect.detected.confidence >= 0.6 ? "border-green-200 bg-green-50/70 text-green-800" : "border-amber-200 bg-amber-50 text-amber-800")}>
            {autoNote}
            {inspect?.detected?.suggested && inspect.detected.confidence < 1 && inspect.detected.alternatives?.length > 0 && (
              <span className="ml-1 text-xs opacity-80">Alternatives: {inspect.detected.alternatives.slice(0, 2).map((a) => `${a.domain} ${Math.round(a.confidence * 100)}%`).join(", ")}</span>
            )}
          </div>
        )}

        {/* Column chips + warnings */}
        {inspect && (
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-bg-soft/60 px-3.5 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Detected columns</span>
              <span className="mx-1 text-border">|</span>
              {inspect.columns.map((h) => {
                const key = h.trim().toLowerCase().replace(/\s+/g, "_");
                const canon = inspect.canonical_columns[inspect.columns.indexOf(h)];
                const isRequired = (REQUIRED_COLUMNS[domain] ?? []).includes(canon);
                const ok = !isRequired || !missing.includes(canon);
                const aliased = canon !== key.toLowerCase();
                return (
                  <span
                    key={h}
                    title={aliased ? `Maps to: ${canon}` : undefined}
                    className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px]", ok ? "bg-green-100 text-green-700" : "bg-warn-50 text-warn")}
                  >
                    {ok ? "✓" : "✗"} {h.trim()}
                    {aliased && <span className="text-green-600/70">→{canon}</span>}
                  </span>
                );
              })}
            </div>
            <div className="grid grid-cols-3 gap-2 px-3.5 py-3 text-xs">
              {DOMAINS.map((d) => {
                const v = inspect.validation[d.value];
                const active = d.value === domain;
                return (
                  <div key={d.value} className={clsx("rounded-lg border px-2.5 py-2", active ? "border-primary bg-primary-50/40" : "border-border bg-white")}>
                    <div className="flex items-center gap-1.5">
                      <Icon name={d.icon as any} className="h-3.5 w-3.5 text-ink-muted" />
                      <span className="font-semibold text-ink">{d.label}</span>
                      <span className={clsx("ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-medium", v.ready ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
                        {v.ready ? "ready" : `${v.confidence ? Math.round(v.confidence * 100) : 0}%`}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-ink-muted">{v.ready ? "All required columns present" : `Missing: ${v.missing.join(", ") || "—"}`}</p>
                  </div>
                );
              })}
            </div>
            {inspect.warnings.length > 0 && (
              <div className="border-t border-border bg-amber-50/60 px-3.5 py-2 text-xs text-amber-700">
                {inspect.warnings.map((w, i) => (
                  <p key={i}>· {w}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {inspect && missing.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p>
              <span className="font-medium">This file doesn&apos;t match {DOMAIN_LABEL[domain]}.</span> {DOMAIN_LABEL[domain]} needs <strong>{REQUIRED_COLUMNS[domain].join(", ")}</strong> — missing <strong>{missing.join(", ")}</strong>.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DOMAINS.map((d) => {
                const v = inspect.validation[d.value];
                return (
                  <button
                    key={d.value}
                    type="button"
                    disabled={v.ready === false && d.value !== domain && v.missing.length > 0 && v.confidence < 0.5}
                    onClick={() => setDomain(d.value)}
                    className={clsx(
                      "rounded-lg border px-2.5 py-1 text-xs font-medium",
                      d.value === domain ? "border-primary bg-primary-50 text-primary" : v.ready ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100" : "border-border bg-white text-ink-muted"
                    )}
                  >
                    {d.label}: {v.ready ? "✓ ready" : `${v.confidence ? Math.round(v.confidence * 100) : 0}%`}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-amber-800/80">The Inspector highlights which columns matched. Switch domain or rename headers to align.</p>
          </div>
        )}

        {/* Preview */}
        {inspect && inspect.preview.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="border-b border-border bg-bg-soft/60 px-3.5 py-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Preview — first {Math.min(inspect.preview.length, 5)} rows</div>
            <div className="max-h-56 overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-border text-ink-muted">
                    {inspect.columns.map((h) => (
                      <th key={h} className="max-w-44 truncate px-3.5 py-2 font-semibold">
                        {h.trim()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {inspect.preview.slice(0, 5).map((row, i) => (
                    <tr key={i} className="hover:bg-bg-soft/50">
                      {inspect.columns.map((h) => (
                        <td key={h} className="max-w-44 truncate px-3.5 py-2 text-ink-soft">
                          {row[h] ?? row[h.toLowerCase()] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Agent pipeline + progress */}
        {(uploading || result) && <AgentPipeline progress={progress} uploading={uploading} error={serverError} done={!!result} />}

        {uploading && (
          <div className="space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-border">
              <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span>{progress < 90 ? (file && file.size > CHUNK_THRESHOLD ? `Streaming ${Math.ceil(file.size / (1024 * 1024))} chunks… ${progress}%` : `Uploading… ${progress}%`) : progress < 100 ? "Finalizing…" : "Done"}</span>
              <button type="button" onClick={handleCancel} className="font-medium text-warn hover:text-warn-600">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Domain selector + action */}
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
            {inspect?.detected?.suggested && inspect.detected.suggested !== domain && inspect.validation[domain]?.ready && (
              <p className="mt-1 text-xs text-amber-600">Heads up: file looks like {DOMAIN_LABEL[inspect.detected.suggested]}, but you selected {DOMAIN_LABEL[domain]}.</p>
            )}
          </label>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              disabled={blocked}
              title={missing.length > 0 ? `Missing columns: ${missing.join(", ")}` : !file ? "Choose a file to upload" : undefined}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-white shadow-lift hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {file && file.size > CHUNK_THRESHOLD ? "Streaming…" : "Loading into warehouse…"}
                </>
              ) : (
                <>
                  <Icon name="pipe" className="h-4 w-4" />
                  {inspect?.detected?.suggested && !domain ? "Auto-detect & load" : "Validate & load"}
                </>
              )}
            </button>
          </div>
        </div>

        {result && <ResultCard result={result} onReset={handleReset} />}
      </form>
    </Panel>
  );
}
