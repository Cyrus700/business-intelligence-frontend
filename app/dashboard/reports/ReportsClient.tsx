"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import PagedTransactions from "@/components/dashboard/live/PagedTransactions";
import { Modal } from "@/components/ui/Modal";
import Icon from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { RangePicker, useFilters } from "@/lib/filters";
import { useRole, hasMinRole } from "@/lib/use-role";
import {
  downloadReport,
  createReportSchedule,
  deleteReportSchedule,
  updateReportSchedule,
  generateReport as apiGenerateReport,
  getReportSchedules,
  getReports,
  type ReportOut,
  type ReportRequest,
  type ReportScheduleOut,
  type ReportJobOut,
} from "@/lib/api";
import ReportQueue from "./ReportQueue";

const REPORTS_KEY = ["reports"] as const;
const SCHEDULES_KEY = ["report-schedules"] as const;
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

const STAGES = [
  "Queued",
  "Collecting warehouse data",
  "Rendering visuals",
  "Finalizing file",
] as const;

type TemplateMeta = {
  id: string;
  label: string;
  desc: string;
  badge: string;
  accent: string;
  includes: string[];
  formatDefault: "pdf" | "xlsx";
};

const TEMPLATES: TemplateMeta[] = [
  {
    id: "executive",
    label: "Executive Summary",
    desc: "Board-ready: KPIs, P&L, health & risks",
    badge: "Popular",
    accent: "from-violet-600 via-indigo-600 to-sky-500",
    includes: ["KPI Summary", "P&L", "Health", "Risks"],
    formatDefault: "pdf",
  },
  {
    id: "sales",
    label: "Sales Performance",
    desc: "Product, region & channel deep-dive",
    badge: "Revenue",
    accent: "from-emerald-600 via-teal-600 to-cyan-600",
    includes: ["By product", "By region", "By channel"],
    formatDefault: "pdf",
  },
  {
    id: "finance",
    label: "Financial P&L",
    desc: "Revenue, expenses & margin by month",
    badge: "Finance",
    accent: "from-amber-600 via-orange-600 to-rose-600",
    includes: ["Monthly P&L", "Margin", "Expenses"],
    formatDefault: "xlsx",
  },
  {
    id: "inventory",
    label: "Inventory Health",
    desc: "Stock levels & reorder signals",
    badge: "Ops",
    accent: "from-sky-600 via-blue-600 to-indigo-600",
    includes: ["Snapshot", "Below reorder"],
    formatDefault: "xlsx",
  },
  {
    id: "forecast",
    label: "Forecast & Anomalies",
    desc: "30-day forecast + ML anomalies",
    badge: "ML",
    accent: "from-fuchsia-600 via-violet-600 to-indigo-600",
    includes: ["Forecast", "Anomalies"],
    formatDefault: "pdf",
  },
  {
    id: "custom",
    label: "Custom",
    desc: "Pick every section",
    badge: "Advanced",
    accent: "from-slate-800 to-slate-900",
    includes: ["Fully configurable"],
    formatDefault: "pdf",
  },
];

const SECTIONS = [
  { id: "kpis", label: "KPI headline", desc: "Revenue, orders, margin", on: true },
  { id: "trends", label: "Revenue trends", desc: "Timeseries & decomposition", on: true },
  { id: "products", label: "Top products", desc: "Bar + donut visuals", on: true },
  { id: "regions", label: "Regions & channels", desc: "Breakdown tables", on: true },
  { id: "insights", label: "AI insights & anomalies", desc: "Auto narrative", on: true },
  { id: "pnl", label: "P&L detail", desc: "Revenue, expenses, net", on: false },
  { id: "forecast", label: "Forecast band", desc: "30-day projection", on: false },
];

function fmtDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function fmtShort(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function relativeTime(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function daysBetween(a: string, b: string) {
  const da = new Date(`${a}T00:00:00`).getTime();
  const db = new Date(`${b}T00:00:00`).getTime();
  return Math.max(1, Math.round((db - da) / 86400000) + 1);
}
function templateFor(id: string) {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

function sanitizeFileName(name: string) {
  return name
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/__+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "report";
}

// ── Download button: idle → downloading (with %) → done (green) → idle ──
async function downloadWithName(report: ReportOut, customName?: string) {
  const token = (() => {
    try { return (typeof window !== "undefined" && localStorage.getItem("token")) || ""; } catch { return ""; }
  })();
  // Use the central helper but override filename client-side: fetch blob then save with custom name
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
  // Try to get token via imported getToken if available (fallback to fetch with header from downloadReport logic)
  // We will reuse downloadReport's token handling by directly calling it with fetch and custom filename logic
  // Simpler: call downloadReport then rename? Instead, reimplement here to allow custom name.
  const rawToken = (() => {
    try {
      // dynamic import-like access: try to read from document cookie/localStorage already handled above
      return "";
    } catch { return ""; }
  })();
  // Fallback: use the existing downloadReport's fetch but intercept filename
  // To keep auth, we replicate the logic from lib/api downloadReport with custom filename support
  const { getToken } = await import("@/lib/auth");
  const tk = getToken();
  const res = await fetch(`${base}/reports/${report.id}/download`, {
    headers: tk ? { Authorization: `Bearer ${tk}` } : {},
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(String((b as any).detail ?? res.statusText));
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safe = customName ? sanitizeFileName(customName) : `report-${report.period_start}-${report.period_end}`;
  a.download = `${safe}.${report.format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function DownloadButton({ report, size = "md", fileName }: { report: ReportOut; size?: "sm" | "md"; fileName?: string }) {
  const [state, setState] = useState<"idle" | "downloading" | "done" | "error">("idle");
  const [pct, setPct] = useState(0);

  async function onClick() {
    if (state === "downloading") return;
    setState("downloading");
    setPct(8);
    const t = setInterval(() => setPct((p) => (p < 86 ? p + Math.random() * 17 : p)), 160);
    try {
      if (fileName && fileName.trim()) {
        await downloadWithName(report, fileName);
      } else {
        await downloadReport(report);
      }
      clearInterval(t);
      setPct(100);
      setState("done");
      setTimeout(() => {
        setState("idle");
        setPct(0);
      }, 2200);
    } catch {
      clearInterval(t);
      setState("error");
      setTimeout(() => {
        setState("idle");
        setPct(0);
      }, 2600);
    }
  }

  if (state === "done") {
    return (
      <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
        <span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-600 text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="h-3 w-3">
            <path d="M5 12l4 4 10-10" />
          </svg>
        </span>
        Downloaded
      </span>
    );
  }

  const h = size === "sm" ? "h-7 text-[11px] px-2.5" : "h-8 text-xs px-3";
  return (
    <button
      onClick={onClick}
      disabled={state === "downloading"}
      className={
        state === "error"
          ? `relative inline-flex ${h} items-center gap-1.5 overflow-hidden rounded-full border border-red-200 bg-red-50 font-semibold text-red-700 hover:bg-red-100`
          : state === "downloading"
            ? `relative inline-flex ${h} items-center gap-1.5 overflow-hidden rounded-full bg-ink font-semibold text-white shadow ${h} disabled:opacity-100`
            : `inline-flex ${h} items-center gap-1.5 rounded-full border border-border bg-white font-semibold text-ink hover:border-ink/15 hover:bg-bg-soft transition-colors`
      }
    >
      {state === "downloading" && <span className="absolute inset-0 bg-white/10" style={{ width: `${pct}%`, transition: "width 160ms linear" }} aria-hidden />}
      <span className="relative flex items-center gap-1.5">
        {state === "downloading" ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : state === "error" ? <Icon name="alert" className="h-3.5 w-3.5" /> : <Icon name="download" className="h-3.5 w-3.5" />}
        {state === "downloading" ? `${Math.min(99, Math.round(pct))}%` : state === "error" ? "Retry" : "Download"}
      </span>
    </button>
  );
}

// ── Report list (premium) — filters + pagination ──
function ReportList({ pending }: { pending: { period_start: string; period_end: string; format: "pdf" | "xlsx"; template: string; fileName?: string } | null }) {
  const { data, error, isLoading } = useQuery<ReportOut[]>({ queryKey: REPORTS_KEY, queryFn: getReports });

  // filters
  const [q, setQ] = useState("");
  const [fmt, setFmt] = useState<"all" | "pdf" | "xlsx">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<"all" | "7d" | "30d" | "90d" | "custom">("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "period_long" | "period_short">("newest");
  const [showFilters, setShowFilters] = useState(false);

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const customNames: Record<string, string> = useMemo(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem("reports:customNames") || "{}"); } catch { return {}; }
  }, [data]);

  const reportTypes = useMemo(() => {
    if (!data) return [];
    const s = new Set<string>(data.map((r) => r.report_type));
    return Array.from(s);
  }, [data]);

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (fmt !== "all") c++;
    if (typeFilter !== "all") c++;
    if (dateFilter !== "all") c++;
    if (q.trim()) c++;
    return c;
  }, [fmt, typeFilter, dateFilter, q]);

  const filteredSorted = useMemo(() => {
    if (!data) return [];
    let out = [...data];

    // text search
    const needle = q.trim().toLowerCase();
    if (needle) {
      out = out.filter((r) => {
        const hay = `${r.report_type} ${r.period_start} ${r.period_end} ${r.format} ${fmtDate(r.period_start)} ${fmtDate(r.period_end)} ${fmtDate(r.created_at.slice(0, 10))}`.toLowerCase();
        return hay.includes(needle);
      });
    }

    if (fmt !== "all") out = out.filter((r) => r.format === fmt);
    if (typeFilter !== "all") out = out.filter((r) => r.report_type === typeFilter);

    // date filter on created_at (also supports period range custom)
    const now = Date.now();
    if (dateFilter === "7d") out = out.filter((r) => now - new Date(r.created_at).getTime() < 7 * 86400000);
    if (dateFilter === "30d") out = out.filter((r) => now - new Date(r.created_at).getTime() < 30 * 86400000);
    if (dateFilter === "90d") out = out.filter((r) => now - new Date(r.created_at).getTime() < 90 * 86400000);
    if (dateFilter === "custom" && customFrom && customTo) {
      const cf = new Date(`${customFrom}T00:00:00`).getTime();
      const ct = new Date(`${customTo}T00:00:00`).getTime() + 86400000;
      out = out.filter((r) => {
        const t = new Date(r.created_at).getTime();
        return t >= cf && t < ct;
      });
    }

    // sort
    out.sort((a, b) => {
      if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === "period_long") return daysBetween(b.period_start, b.period_end) - daysBetween(a.period_start, a.period_end);
      if (sortBy === "period_short") return daysBetween(a.period_start, a.period_end) - daysBetween(b.period_start, b.period_end);
      return 0;
    });

    return out;
  }, [data, q, fmt, typeFilter, dateFilter, customFrom, customTo, sortBy]);

  // reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [q, fmt, typeFilter, dateFilter, customFrom, customTo, sortBy, pageSize]);

  const total = filteredSorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const paginated = filteredSorted.slice(startIdx, startIdx + pageSize);
  const showingFrom = total === 0 ? 0 : startIdx + 1;
  const showingTo = Math.min(total, startIdx + pageSize);

  function clearAll() {
    setQ("");
    setFmt("all");
    setTypeFilter("all");
    setDateFilter("all");
    setCustomFrom("");
    setCustomTo("");
    setSortBy("newest");
  }

  if (error) return <p className="text-sm text-warn">{(error as Error).message}</p>;
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-bg-soft" />
        ))}
      </div>
    );
  }

  const empty = !data || data.length === 0;

  // pagination helpers
  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (safePage > 3) pages.push("...");
    for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) pages.push(i);
    if (safePage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="space-y-4">
      {/* toolbar — search + quick format + filter toggle + sort */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-[360px]">
            <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search reports, dates, template…"
              className="h-10 w-full rounded-full border border-border bg-white pl-10 pr-10 text-sm placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
            />
            {q && (
              <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-ink-muted hover:bg-bg-soft hover:text-ink" aria-label="Clear search">
                <Icon name="close" className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* format pills — keep for 1-tap */}
            <div className="hidden items-center gap-1 rounded-full border border-border bg-bg-soft p-1 sm:inline-flex">
              {(["all", "pdf", "xlsx"] as const).map((f) => (
                <button key={f} onClick={() => setFmt(f)} className={fmt === f ? "rounded-full bg-ink px-3.5 py-1.5 text-xs font-semibold text-white shadow" : "rounded-full px-3.5 py-1.5 text-xs font-medium text-ink-soft hover:text-ink"}>
                  {f === "all" ? "All" : f.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition ${showFilters || activeFilterCount > 0 ? "border-ink bg-ink text-white shadow" : "border-border bg-white text-ink hover:bg-bg-soft"}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} className="h-3.5 w-3.5" aria-hidden>
                <path d="M3 6h18M7 12h10M10 18h4" />
              </svg>
              Filters
              {activeFilterCount > 0 && <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-white px-1.5 text-[11px] font-bold leading-none text-ink">{activeFilterCount}</span>}
            </button>

            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="h-9 appearance-none rounded-full border border-border bg-white pl-3 pr-8 text-xs font-medium text-ink focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                aria-label="Sort reports"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="period_long">Longest period</option>
                <option value="period_short">Shortest period</option>
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </div>
          </div>
        </div>

        {/* advanced filters panel — premium, collapsible */}
        {showFilters && (
          <div className="rounded-2xl border border-border bg-bg-soft p-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Format</span>
                <div className="flex gap-1.5">
                  {(["all", "pdf", "xlsx"] as const).map((f) => (
                    <button key={f} type="button" onClick={() => setFmt(f)} className={fmt === f ? "flex-1 rounded-full bg-ink px-3 py-2 text-xs font-semibold text-white" : "flex-1 rounded-full border border-border bg-white px-3 py-2 text-xs font-medium text-ink-soft hover:bg-white"}>
                      {f === "all" ? "All" : f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Template</span>
                <div className="relative">
                  <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-10 w-full appearance-none rounded-xl border border-border bg-white px-3 pr-8 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10">
                    <option value="all">All templates</option>
                    {reportTypes.map((t) => (
                      <option key={t} value={t} className="capitalize">
                        {t.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </span>
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Created</span>
                <div className="relative">
                  <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value as typeof dateFilter)} className="h-10 w-full appearance-none rounded-xl border border-border bg-white px-3 pr-8 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10">
                    <option value="all">All time</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="90d">Last 90 days</option>
                    <option value="custom">Custom range</option>
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </span>
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Page size</span>
                <div className="relative">
                  <select value={String(pageSize)} onChange={(e) => setPageSize(Number(e.target.value))} className="h-10 w-full appearance-none rounded-xl border border-border bg-white px-3 pr-8 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10">
                    <option value="6">6 / page</option>
                    <option value="10">10 / page</option>
                    <option value="20">20 / page</option>
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </span>
                </div>
              </label>
            </div>

            {dateFilter === "custom" && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-ink-muted">From (created)</span>
                  <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-ink-muted">To (created)</span>
                  <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10" />
                </label>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-ink-soft">
                {total} {total === 1 ? "report" : "reports"} match · {data?.length ?? 0} total in library
              </p>
              <div className="flex items-center gap-2">
                <button onClick={clearAll} className="rounded-full border border-border bg-white px-4 py-1.5 text-xs font-medium text-ink hover:bg-bg-soft">
                  Clear all
                </button>
                <button onClick={() => setShowFilters(false)} className="rounded-full bg-ink px-4 py-1.5 text-xs font-semibold text-white">
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* active chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {q && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-ink ring-1 ring-border">
                Search: “{q}” <button onClick={() => setQ("")} className="rounded-full p-0.5 hover:bg-bg-soft" aria-label="Clear search"><Icon name="close" className="h-3 w-3" /></button>
              </span>
            )}
            {fmt !== "all" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">
                {fmt.toUpperCase()} <button onClick={() => setFmt("all")} className="rounded-full bg-white/15 p-0.5 hover:bg-white/25" aria-label="Clear format"><Icon name="close" className="h-3 w-3" /></button>
              </span>
            )}
            {typeFilter !== "all" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white capitalize">
                {typeFilter.replace(/_/g, " ")} <button onClick={() => setTypeFilter("all")} className="rounded-full bg-white/15 p-0.5 hover:bg-white/25" aria-label="Clear type"><Icon name="close" className="h-3 w-3" /></button>
              </span>
            )}
            {dateFilter !== "all" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white">
                {dateFilter === "custom" ? `${customFrom || "…"} → ${customTo || "…"}` : dateFilter} <button onClick={() => setDateFilter("all")} className="rounded-full bg-white/15 p-0.5 hover:bg-white/25" aria-label="Clear date"><Icon name="close" className="h-3 w-3" /></button>
              </span>
            )}
            <button onClick={clearAll} className="text-xs font-medium text-primary hover:underline">Clear all</button>
            <span className="ml-auto text-xs text-ink-muted hidden sm:inline">
              Showing {showingFrom}–{showingTo} of {total}
            </span>
          </div>
        )}
      </div>

      {pending && (
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-white p-4 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-1 bg-border">
            <div className="h-full w-1/2 animate-[loader-progress_1.1s_ease-in-out_infinite] bg-gradient-to-r from-primary via-violet-500 to-sky-500" />
          </div>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-white">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">
                Generating · {templateFor(pending.template).label} · {pending.format.toUpperCase()}
              </p>
              <p className="text-xs text-ink-soft truncate">
                {fmtDate(pending.period_start)} → {fmtDate(pending.period_end)} · {(pending as any).fileName ? `${(pending as any).fileName}.${pending.format} · ` : ""}Pending → Complete
              </p>
            </div>
            <span className="hidden rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200 sm:inline-flex">Pending</span>
          </div>
        </div>
      )}

      {empty && !pending ? (
        <div className="rounded-2xl border border-dashed border-border bg-bg-soft/40 p-10 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white shadow-card ring-1 ring-black/5">
            <Icon name="document" className="h-6 w-6 text-ink-muted" />
          </div>
          <p className="mt-4 text-sm font-semibold text-ink">No reports yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-ink-soft">Hit <span className="font-medium text-ink">Export</span> above — your PDF or Excel lands here with a clear Pending → Complete flow.</p>
        </div>
      ) : total === 0 ? (
        <div className="rounded-2xl border border-border bg-white p-8 text-center">
          <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-bg-soft">
            <Icon name="search" className="h-5 w-5 text-ink-muted" />
          </div>
          <p className="mt-3 text-sm font-semibold text-ink">No reports match your filters</p>
          <p className="mt-1 text-sm text-ink-soft">Try clearing filters or searching for a different term.</p>
          <button onClick={clearAll} className="mt-4 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white hover:bg-ink/90">Clear filters</button>
        </div>
      ) : (
        <>
          <div className="grid gap-3">
            {paginated.map((r) => {
              const isPdf = r.format === "pdf";
              const span = daysBetween(r.period_start, r.period_end);
              return (
                <div key={r.id} className="group flex items-center gap-4 rounded-2xl border border-border bg-white p-4 transition hover:border-primary/15 hover:shadow-sm">
                  <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow ${isPdf ? "bg-gradient-to-br from-red-500 to-orange-500" : "bg-gradient-to-br from-emerald-600 to-teal-600"}`} aria-hidden>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-5 w-5">
                      {isPdf ? (
                        <>
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                          <path d="M14 2v6h6" />
                        </>
                      ) : (
                        <>
                          <rect x="4" y="4" width="16" height="16" rx="2" />
                          <path d="M4 10h16M10 4v16" />
                        </>
                      )}
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-ink" title={customNames[r.id] || undefined}>{customNames[r.id] ? customNames[r.id] : `${r.report_type.replace(/_/g, " ")} report`}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${isPdf ? "bg-red-50 text-red-700 ring-1 ring-red-200" : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"}`}>{r.format}</span>
                      <span className="hidden items-center gap-1 text-xs text-emerald-600 sm:inline-flex">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Ready
                      </span>
                      <span className="hidden text-xs text-ink-muted sm:inline">· {span}d</span>
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
                      <span className="inline-flex items-center gap-1 rounded-full bg-bg-soft px-2.5 py-1 font-medium">
                        <Icon name="calendar" className="h-3 w-3" />
                        {fmtDate(r.period_start)} – {fmtDate(r.period_end)}
                      </span>
                      <span className="hidden sm:inline">· {relativeTime(r.created_at)}</span>
                      <span className="hidden sm:inline">· {new Date(r.created_at).toLocaleDateString()} {new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </p>
                  </div>
                  <div className="ml-auto flex shrink-0 items-center gap-2">
                    <DownloadButton report={r} fileName={customNames[r.id]} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* pagination — premium */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-center text-xs font-medium text-ink-soft sm:text-left">
              Showing <span className="font-semibold text-ink">{showingFrom}–{showingTo}</span> of <span className="font-semibold text-ink">{total}</span> {total === 1 ? "report" : "reports"}
              {activeFilterCount > 0 && <span className="text-ink-muted"> · filtered from {data?.length ?? 0}</span>}
            </p>

            <div className="flex items-center justify-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-ink hover:bg-bg-soft disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Previous page"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} className="h-4 w-4">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>

              <div className="flex items-center gap-1">
                {pages.map((p, idx) =>
                  p === "..." ? (
                    <span key={`e-${idx}`} className="px-1 text-xs text-ink-muted">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={p === safePage ? "grid h-8 w-8 place-items-center rounded-full bg-ink text-xs font-semibold text-white shadow" : "grid h-8 w-8 place-items-center rounded-full border border-border bg-white text-xs font-medium text-ink-soft hover:bg-bg-soft hover:text-ink"}
                      aria-current={p === safePage ? "page" : undefined}
                    >
                      {p}
                    </button>
                  ),
                )}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-ink hover:bg-bg-soft disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Next page"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} className="h-4 w-4">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            </div>

            <div className="hidden items-center gap-2 text-xs text-ink-soft sm:flex">
              <span>Rows:</span>
              <div className="inline-flex rounded-full border border-border bg-bg-soft p-1">
                {[6, 10, 20].map((n) => (
                  <button key={n} onClick={() => setPageSize(n)} className={pageSize === n ? "rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-ink shadow-sm" : "rounded-full px-2.5 py-1 text-xs font-medium text-ink-soft hover:text-ink"}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Builder modal: single-page, premium, no tabs ──
function BuilderModal({ onClose, initial }: { onClose: () => void; initial: { template: string; from: string; to: string; format: "pdf" | "xlsx" } }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [template, setTemplate] = useState(initial.template);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [format, setFormat] = useState<"pdf" | "xlsx">(initial.format);
  const [sections, setSections] = useState<Record<string, boolean>>(() => Object.fromEntries(SECTIONS.map((s) => [s.id, s.on])));
  const [builderFileName, setBuilderFileName] = useState("");
  const [error, setError] = useState("");
  const [stageIdx, setStageIdx] = useState(0);
  const [done, setDone] = useState<any>(null);
  const [emailMe, setEmailMe] = useState(true);

  const span = daysBetween(from, to);
  const included = Object.values(sections).filter(Boolean).length;
  const builderDefaultName = useMemo(() => sanitizeFileName(`${templateFor(template).label}_${from}_to_${to}`), [template, from, to]);

  const mutation = useMutation({
    mutationFn: (b: ReportRequest) => apiGenerateReport(b),
    onMutate: () => setStageIdx(0),
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: REPORTS_KEY });
      setDone(r);
      setStageIdx(STAGES.length - 1);
      try {
        const key = "reports:customNames";
        const prev = JSON.parse(localStorage.getItem(key) || "{}");
        const desired = (builderFileName.trim() || builderDefaultName) as string;
        prev[r.id] = desired;
        localStorage.setItem(key, JSON.stringify(prev));
      } catch {}
      toast(`Report exported`, { description: emailMe ? `Your ${(r.format ?? "pdf").toString().toUpperCase()} is ready — email queued to your inbox.` : `${(r.format ?? "pdf").toString().toUpperCase()} ready for download.`, type: "success" });
    },
    onError: (e: Error) => {
      setError(e.message);
      toast("Export failed", { description: e.message, type: "error" });
    },
  });

  useEffect(() => {
    if (!mutation.isPending) return;
    const id = setInterval(() => setStageIdx((s) => Math.min(STAGES.length - 1, s + 1)), 850);
    return () => clearInterval(id);
  }, [mutation.isPending]);

  useEffect(() => setFormat(templateFor(template).formatDefault), [template]);

  function generate() {
    setError("");
    if (to < from) {
      setError("End date must be on or after start date.");
      return;
    }
    if (included === 0) {
      setError("Select at least one section.");
      return;
    }
    mutation.mutate({ period_start: from, period_end: to, format, email_me: emailMe });
  }

  return (
    <Modal title="Customize report" subtitle="Templates, period & sections — all in one place. Or just use 1-click export." onClose={onClose} wide>
      <div className="space-y-5">
        {mutation.isPending && (
          <div className="rounded-2xl border border-primary/15 bg-primary/[0.04] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-primary">Exporting — Pending → Complete</span>
              <span className="text-xs font-medium text-ink-muted">
                {stageIdx + 1}/{STAGES.length}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full bg-gradient-to-r from-primary via-violet-500 to-sky-500 transition-all duration-700" style={{ width: `${((stageIdx + 1) / STAGES.length) * 100}%` }} />
            </div>
            <p className="mt-2 flex items-center gap-2 text-xs">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="font-medium text-ink">{STAGES[stageIdx]}</span>
              <span className="text-ink-soft">· usually 6–10s</span>
            </p>
          </div>
        )}
        {done && !mutation.isPending && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-600 text-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-4 w-4">
                <path d="M5 12l4 4 10-10" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-emerald-900">Done — Complete ✓</p>
              <p className="text-xs text-emerald-700">
                {fmtDate(done.period_start)} → {fmtDate(done.period_end)} · {(done.format ?? "pdf").toString().toUpperCase()}
              </p>
            </div>
            <DownloadButton report={done} fileName={builderFileName.trim() || builderDefaultName} />
          </div>
        )}
        {error && <div className="rounded-xl bg-warn-50 px-4 py-3 text-sm text-warn">{error}</div>}

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Template</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id)}
                className={template === t.id ? "relative overflow-hidden rounded-2xl border-2 border-primary bg-white p-3 text-left shadow-sm" : "relative overflow-hidden rounded-2xl border border-border bg-white p-3 text-left hover:border-primary/20"}
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${t.accent}`} aria-hidden />
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">{t.label}</p>
                  <span className={template === t.id ? "rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white" : "rounded-full bg-bg-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted"}>
                    {t.badge}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">From</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">To</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10" />
          </label>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Sections ({included} included)</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {SECTIONS.map((s) => (
              <label key={s.id} className={sections[s.id] ? "flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/[0.04] px-3 py-2.5" : "flex items-center gap-3 rounded-xl border border-border bg-white px-3 py-2.5"}>
                <input type="checkbox" checked={!!sections[s.id]} onChange={() => setSections((p) => ({ ...p, [s.id]: !p[s.id] }))} className="h-4 w-4 rounded border-border text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">{s.label}</span>
                  <span className="block text-xs text-ink-muted">{s.desc}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="builder-filename" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">File name <span className="normal-case font-normal text-ink-muted/60">(optional)</span></label>
          <div className="relative">
            <input id="builder-filename" value={builderFileName} onChange={(e) => setBuilderFileName(e.target.value)} placeholder={builderDefaultName} maxLength={80} className="h-10 w-full rounded-xl border border-border bg-white px-3 pr-12 text-sm placeholder:text-ink-muted/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10" />
            <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-bg-soft px-2 py-1 text-xs font-medium text-ink-muted">.{format}</span>
          </div>
          <p className="mt-1.5 text-xs text-ink-muted">Leave empty for default: <span className="font-medium text-ink-soft">{builderDefaultName}.{format}</span></p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Format</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["pdf", "xlsx"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={format === f ? "rounded-2xl border-2 border-primary bg-white p-3 text-left shadow-sm" : "rounded-2xl border border-border bg-white p-3 text-left"}
              >
                <span className={`grid h-8 w-8 place-items-center rounded-xl text-white ${f === "pdf" ? "bg-gradient-to-br from-red-500 to-orange-500" : "bg-gradient-to-br from-emerald-600 to-teal-600"}`}>
                  <Icon name={f === "pdf" ? "document" : "table"} className="h-4 w-4" />
                </span>
                <p className="mt-2 text-sm font-semibold text-ink">{f === "pdf" ? "PDF — print-ready" : "Excel — pivot-ready"}</p>
                <p className="text-xs text-ink-muted">{f === "pdf" ? "Charts + tables, A4" : "Sheets with raw data"}</p>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            {span}d · ~{format === "pdf" ? 2 + included : 1 + included} {format === "pdf" ? "pages" : "sheets"} · ready to share
          </p>
        </div>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-bg-soft px-3 py-2.5 hover:border-primary/20">
          <input type="checkbox" checked={emailMe} onChange={(e) => setEmailMe(e.target.checked)} className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20" />
          <span className="flex-1">
            <span className="block text-sm font-medium text-ink">Email me a copy</span>
            <span className="block text-xs text-ink-soft">Professional delivery with attachment</span>
          </span>
          <span className="text-lg" aria-hidden>✉️</span>
        </label>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <button onClick={onClose} className="rounded-full border border-border bg-white px-5 py-2.5 text-sm font-medium text-ink hover:bg-bg-soft">
            Close
          </button>
          <button onClick={generate} disabled={mutation.isPending} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-lift hover:bg-primary-600 disabled:opacity-60">
            {mutation.isPending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Icon name="spark" className="h-4 w-4" />}
            {mutation.isPending ? STAGES[stageIdx] : done ? "Generate another" : "Generate"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Schedule modal (premium, compact) ──
function ScheduleModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: schedules, isLoading } = useQuery<ReportScheduleOut[]>({ queryKey: SCHEDULES_KEY, queryFn: getReportSchedules });
  const [freq, setFreq] = useState<"weekly" | "monthly">("weekly");
  const [dow, setDow] = useState(0);
  const [dom, setDom] = useState(1);
  const [fmt, setFmt] = useState<"pdf" | "xlsx">("pdf");
  const [err, setErr] = useState("");

  const create = useMutation({ mutationFn: createReportSchedule, onSuccess: () => qc.invalidateQueries({ queryKey: SCHEDULES_KEY }), onError: (e: Error) => setErr(e.message) });
  const toggle = useMutation({ mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => updateReportSchedule(id, { is_active }), onSuccess: () => qc.invalidateQueries({ queryKey: SCHEDULES_KEY }) });
  const del = useMutation({ mutationFn: deleteReportSchedule, onSuccess: () => qc.invalidateQueries({ queryKey: SCHEDULES_KEY }) });

  return (
    <Modal title="Schedule report" subtitle="Weekly or monthly auto-export — Power BI-style refresh" onClose={onClose} wide>
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Subscriptions · {schedules?.length ?? 0}</p>
          {isLoading && <div className="mt-3 h-14 animate-pulse rounded-2xl bg-bg-soft" />}
          {!isLoading && (!schedules || schedules.length === 0) && (
            <div className="mt-3 rounded-2xl border border-dashed border-border bg-bg-soft/50 p-6 text-center text-sm text-ink-soft">No schedules yet — create your first digest below.</div>
          )}
          <div className="mt-3 grid gap-2">
            {(schedules ?? []).map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3">
                <span className={`grid h-9 w-9 place-items-center rounded-xl text-white ${s.frequency === "weekly" ? "bg-gradient-to-br from-violet-600 to-indigo-600" : "bg-gradient-to-br from-sky-600 to-blue-600"}`}>
                  <Icon name="calendar" className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold capitalize text-ink">
                    {s.frequency} · {s.format.toUpperCase()}
                    {s.frequency === "weekly" && s.day_of_week !== null ? ` · ${WEEKDAYS[s.day_of_week]}` : ""}
                    {s.frequency === "monthly" && s.day_of_month !== null ? ` · day ${s.day_of_month}` : ""}
                  </p>
                  <p className="text-xs text-ink-muted">Next {fmtDate(s.next_run_at)}</p>
                </div>
                <span className={`hidden rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-flex ${s.is_active ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-warn-50 text-warn ring-1 ring-warn-200"}`}>{s.is_active ? "Active" : "Paused"}</span>
                <button onClick={() => toggle.mutate({ id: s.id, is_active: !s.is_active })} className={s.is_active ? "rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium hover:bg-bg-soft" : "rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white"}>
                  {s.is_active ? "Pause" : "Resume"}
                </button>
                <button onClick={() => del.mutate(s.id)} className="rounded-full border border-border p-2 text-warn hover:bg-warn-50">
                  <Icon name="close" className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setErr("");
            create.mutate({ frequency: freq, format: fmt, day_of_week: freq === "weekly" ? dow : undefined, day_of_month: freq === "monthly" ? dom : undefined });
          }}
          className="rounded-2xl border border-border bg-bg-soft p-4"
        >
          <p className="text-sm font-semibold text-ink">New schedule</p>
          {err && <div className="mt-2 rounded-xl bg-warn-50 px-3 py-2 text-sm text-warn">{err}</div>}
          <div className="mt-3 flex gap-2">
            {(["weekly", "monthly"] as const).map((f) => (
              <button key={f} type="button" onClick={() => setFreq(f)} className={freq === f ? "flex-1 rounded-xl bg-ink px-3 py-2.5 text-sm font-semibold capitalize text-white" : "flex-1 rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-medium capitalize text-ink-soft"}>
                {f}
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {freq === "weekly" ? (
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink-muted">Day</span>
                <select value={dow} onChange={(e) => setDow(Number(e.target.value))} className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm">
                  {WEEKDAYS.map((d, i) => (
                    <option key={d} value={i}>{d}</option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink-muted">Day of month</span>
                <select value={dom} onChange={(e) => setDom(Number(e.target.value))} className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm">
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </label>
            )}
            <div>
              <span className="mb-1 block text-xs font-medium text-ink-muted">Format</span>
              <div className="flex gap-2">
                {(["pdf", "xlsx"] as const).map((f) => (
                  <button key={f} type="button" onClick={() => setFmt(f)} className={fmt === f ? "flex-1 rounded-xl border-2 border-primary bg-white py-2.5 text-sm font-semibold text-primary" : "flex-1 rounded-xl border border-border bg-white py-2.5 text-sm text-ink-soft"}>
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button type="submit" disabled={create.isPending} className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-60">
              {create.isPending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />} Add schedule
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

// ── Main ──
export default function ReportsClient() {
  const role = useRole();
  const canGenerate = hasMinRole(role, "manager");
  const { filters } = useFilters();
  const qc = useQueryClient();
  const generatedRef = useRef<HTMLDivElement>(null);

  const [format, setFormat] = useState<"pdf" | "xlsx">("pdf");
  const [template, setTemplate] = useState("executive");
  const [fileName, setFileName] = useState("");
  const [editingPeriod, setEditingPeriod] = useState(false);
  const [periodStart, setPeriodStart] = useState(filters.from);
  const [periodEnd, setPeriodEnd] = useState(filters.to);
  const [showBuilder, setShowBuilder] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [doneReport, setDoneReport] = useState<ReportOut | null>(null);
  const [error, setError] = useState("");
  const [emailMe, setEmailMe] = useState(true);
  const toast = useToast();

  const { data: reports } = useQuery<ReportOut[]>({ queryKey: REPORTS_KEY, queryFn: getReports });
  const { data: schedules } = useQuery<ReportScheduleOut[]>({ queryKey: SCHEDULES_KEY, queryFn: getReportSchedules, enabled: !!canGenerate });

  // keep period in sync with global filter until user edits
  useEffect(() => {
    if (!editingPeriod) {
      setPeriodStart(filters.from);
      setPeriodEnd(filters.to);
    }
  }, [filters.from, filters.to, editingPeriod]);

  const total = reports?.length ?? 0;
  const thisMonth = useMemo(() => (reports ? reports.filter((r) => Date.now() - new Date(r.created_at).getTime() < 30 * 86400000).length : 0), [reports]);
  const span = daysBetween(periodStart, periodEnd);
  const defaultFileName = useMemo(() => sanitizeFileName(`${templateFor(template).label}_${periodStart}_to_${periodEnd}`), [template, periodStart, periodEnd]);
  const nextRun = schedules?.find((s) => s.is_active)?.next_run_at ?? null;

  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (b: ReportRequest) => apiGenerateReport(b) as unknown as Promise<ReportJobOut & ReportOut>,
    onMutate: () => {
      setStageIdx(0);
      setDoneReport(null);
      setError("");
    },
    onSuccess: (r: any) => {
      // New queue-based API returns a job with status pending/claimed, not a ReportOut
      if (r.status === "pending" || r.status === "claimed") {
        setActiveJobId(r.id);
        qc.invalidateQueries({ queryKey: ["report-jobs"] });
        toast("Report queued", {
          description: r.position ? `Position ${r.position} of ${r.total_in_queue} — ~${r.estimated_wait_seconds}s · Worker handles 100 concurrent exports via queue.` : "Queued — worker will build it shortly.",
          type: "success",
        });
        // Keep polling; when job succeeds, ReportQueue will show download and we invalidate reports
        return;
      }
      // Fallback for old sync API (should not happen now)
      qc.invalidateQueries({ queryKey: REPORTS_KEY });
      setDoneReport(r as ReportOut);
      setStageIdx(STAGES.length - 1);
      try {
        const key = "reports:customNames";
        const prev = JSON.parse(localStorage.getItem(key) || "{}");
        const desired = (fileName.trim() || defaultFileName) as string;
        prev[(r as ReportOut).id] = desired;
        localStorage.setItem(key, JSON.stringify(prev));
      } catch {}
      toast("Report exported", {
        description: emailMe ? `Your ${((r as any).format ?? "pdf").toString().toUpperCase()} is ready — email queued to your inbox.` : `${((r as any).format ?? "pdf").toString().toUpperCase()} ready for download.`,
        type: "success",
      });
    },
    onError: (e: Error) => {
      setError(e.message);
      toast("Export failed", { description: e.message, type: "error" });
    },
  });

  useEffect(() => {
    if (!mutation.isPending) return;
    const id = setInterval(() => setStageIdx((s) => Math.min(STAGES.length - 1, s + 1)), 900);
    return () => clearInterval(id);
  }, [mutation.isPending]);

  // Poll active job until it succeeds or fails, then refresh reports
  useEffect(() => {
    if (!activeJobId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const { getReportJob } = await import("@/lib/api");
        const job = await getReportJob(activeJobId);
        if (cancelled) return;
        if (job.status === "succeeded" && job.report_id) {
          qc.invalidateQueries({ queryKey: REPORTS_KEY });
          qc.invalidateQueries({ queryKey: ["report-jobs"] });
          // Fetch the new report for the done card
          try {
            const reports = await (await import("@/lib/api")).getReports();
            const found = reports.find((r) => r.id === job.report_id);
            if (found) setDoneReport(found);
          } catch {}
          toast("Report ready", { description: "Worker completed — download is now available.", type: "success" });
          setActiveJobId(null);
          setStageIdx(STAGES.length - 1);
        } else if (job.status === "failed") {
          setError(job.error || "Report failed");
          toast("Report failed", { description: job.error || "Worker failed — will retry.", type: "error" });
          setActiveJobId(null);
        }
      } catch {}
    };
    const iv = setInterval(tick, 2000);
    tick();
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [activeJobId, qc, toast]);

  function handleQuickExport() {
    setError("");
    if (periodEnd < periodStart) {
      setError("End date must be on or after start date.");
      return;
    }
    mutation.mutate({ period_start: periodStart, period_end: periodEnd, format, email_me: emailMe });
  }

  const pendingPayload = mutation.isPending ? { period_start: periodStart, period_end: periodEnd, format, template, fileName: fileName.trim() || defaultFileName } : null;

  return (
    <>
      <PageHeader title="Reports" subtitle="Exports." action={<RangePicker />} />

      {role === "analyst" && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <Icon name="lock" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Viewer — you can download and browse. Ask a Manager to export or schedule.</span>
        </div>
      )}

      {/* stats strip — premium, subtle */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Library</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-ink">{total}</p>
          <p className="text-xs text-ink-soft">{thisMonth} last 30 days</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Next refresh</p>
          <p className="mt-1 text-sm font-semibold text-ink truncate">{nextRun ? fmtDate(nextRun) : "No schedule"}</p>
          <p className="text-xs text-ink-soft">{schedules?.filter((s) => s.is_active).length ?? 0} active</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Pipeline</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-ink">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Pending → Complete
          </p>
          <p className="text-xs text-ink-soft">Every export shows live stages</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-ink to-slate-800 p-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Power BI parity</p>
          <p className="mt-1 text-sm font-semibold">Print-grade PDFs, pivot-ready Excel</p>
          <p className="text-xs text-white/60">One export, any audience</p>
        </div>
      </div>

      {/* premium split — clean RBAC: analyst sees list only (no export clutter), manager sees export + list */}
      <div className={canGenerate ? "mt-6 grid gap-6 lg:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr] items-start" : "mt-6 grid gap-6 items-start"}>
        {/* LEFT — Export (manager+ only — hidden for analyst for a clean, role-specific UI) */}
        {canGenerate ? (
        <div className="lg:sticky lg:top-6 space-y-4">
          <div className={`relative overflow-hidden rounded-[24px] border bg-white shadow-card ${mutation.isPending ? "border-primary/20 shadow-glow" : doneReport && !mutation.isPending ? "border-emerald-200 shadow-glow" : "border-border"}`}>
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-600 via-indigo-600 to-sky-500" aria-hidden />
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-br from-primary/[0.07] via-violet-500/[0.07] to-sky-500/[0.07] blur-2xl" aria-hidden />

            <div className="relative p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden /> 1-click export
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  Pending → Complete
                </span>
              </div>

              <h2 className="mt-3 text-xl font-semibold tracking-tight text-ink">Export your data</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">Pick period & format, hit Export. No wizard — just premium, instant export.</p>

              <div className="mt-4 rounded-2xl border border-border bg-bg-soft p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Period</span>
                  {!editingPeriod ? (
                    <button onClick={() => setEditingPeriod(true)} className="rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-ink hover:bg-white">Edit</button>
                  ) : (
                    <button onClick={() => setEditingPeriod(false)} className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">Done</button>
                  )}
                </div>

                {!editingPeriod ? (
                  <div className="mt-2">
                    <p className="text-sm font-semibold text-ink">{fmtDate(periodStart)} – {fmtDate(periodEnd)}</p>
                    <p className="mt-1 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-ink-soft ring-1 ring-border">{span} day{span !== 1 ? "s" : ""}</span>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs text-ink-muted ring-1 ring-border">{filters.from} → {filters.to}</span>
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-ink-muted">From</span>
                      <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10" />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-ink-muted">To</span>
                      <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10" />
                    </label>
                  </div>
                )}

                <div className="mt-4">
                  <label htmlFor="export-filename" className="mb-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    <span>File name <span className="normal-case font-normal text-ink-muted/60">(optional)</span></span>
                    <span className="rounded-full bg-bg-soft px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-ink-soft ring-1 ring-border">.{format}</span>
                  </label>
                  <div className="relative">
                    <input
                      id="export-filename"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      placeholder={defaultFileName}
                      maxLength={80}
                      className="h-10 w-full rounded-xl border border-border bg-white pl-3 pr-3 text-sm placeholder:text-ink-muted/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                    />
                  </div>
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-muted">
                    <span className="h-1 w-1 rounded-full bg-ink-muted" aria-hidden />
                    Leave empty to use default: <span className="font-medium text-ink-soft">{defaultFileName}.{format}</span>
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Format</span>
                  <div className="ml-auto inline-flex rounded-full border border-border bg-white p-1">
                    {(["pdf", "xlsx"] as const).map((f) => (
                      <button key={f} onClick={() => setFormat(f)} className={format === f ? "rounded-full bg-ink px-4 py-1.5 text-xs font-semibold text-white shadow" : "rounded-full px-4 py-1.5 text-xs font-medium text-ink-soft hover:text-ink"}>
                        {f === "pdf" ? "PDF" : "Excel"}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="mt-1 text-xs text-ink-muted">PDF = charts • Excel = raw sheets</p>
              </div>

              {error && <div className="mt-3 rounded-xl bg-warn-50 px-3 py-2 text-sm text-warn">{error}</div>}

              {mutation.isPending && (
                <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/[0.04] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-primary">Exporting</span>
                    <span className="text-xs font-medium text-ink-muted">{stageIdx + 1}/{STAGES.length} · {STAGES[stageIdx]}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary via-violet-500 to-sky-500 transition-all duration-700" style={{ width: `${((stageIdx + 1) / STAGES.length) * 100}%` }} />
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    {STAGES.map((_, i) => (
                      <span key={i} className={i <= stageIdx ? "h-1.5 flex-1 rounded-full bg-primary" : "h-1.5 flex-1 rounded-full bg-border"} />
                    ))}
                  </div>
                </div>
              )}

              {doneReport && !mutation.isPending && (
                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-600 text-white">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-4 w-4"><path d="M5 12l4 4 10-10" /></svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-emerald-900">Complete ✓</p>
                    <p className="text-xs text-emerald-700">{fmtDate(doneReport.period_start)} → {fmtDate(doneReport.period_end)} · {(doneReport.format ?? "pdf").toString().toUpperCase()}</p>
                  </div>
                  <DownloadButton report={doneReport} fileName={fileName.trim() || defaultFileName} />
                </div>
              )}

              <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-bg-soft px-3 py-2.5 hover:border-primary/20">
                <input type="checkbox" checked={emailMe} onChange={(e) => setEmailMe(e.target.checked)} className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20" />
                <span className="flex-1">
                  <span className="block text-sm font-medium text-ink">Email me a copy</span>
                  <span className="block text-xs text-ink-soft">Send {format.toUpperCase()} to your inbox — professional & clear</span>
                </span>
                <span className="text-lg" aria-hidden>✉️</span>
              </label>

              <button onClick={handleQuickExport} disabled={mutation.isPending} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-white shadow-lift hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed">
                {mutation.isPending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Icon name="download" className="h-4 w-4" />}
                {mutation.isPending ? STAGES[stageIdx] : `Export as ${format.toUpperCase()}`}
              </button>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-ink-muted">1 click • 6–10s</span>
                <button onClick={() => setShowBuilder(true)} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-ink hover:bg-bg-soft">
                  <Icon name="spark" className="h-3.5 w-3.5" /> Customize
                </button>
              </div>

              <p className="mt-3 text-center text-xs leading-relaxed text-ink-muted">Need templates or sections? <button onClick={() => setShowBuilder(true)} className="font-medium text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary">Open builder</button></p>
            </div>
          </div>

          <div className="grid gap-3">
            <button onClick={() => setShowSchedule(true)} className="group flex items-center gap-3 rounded-2xl border border-border bg-white p-4 text-left shadow-sm hover:border-primary/15 hover:shadow-card">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow"><Icon name="calendar" className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">Schedule & refresh</span><span className="block text-xs text-ink-soft">Weekly/monthly auto-exports</span></span>
              <span className="text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">Manage →</span>
            </button>
            <button onClick={() => generatedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} className="group flex items-center gap-3 rounded-2xl border border-border bg-white p-4 text-left shadow-sm hover:border-primary/15 hover:shadow-card lg:hidden">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow"><Icon name="table" className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">Jump to reports</span><span className="block text-xs text-ink-soft">{total} in library</span></span>
              <span className="text-xs font-semibold text-amber-700">↓</span>
            </button>
          </div>
        </div>
        ) : null}

        {/* RIGHT — Generated reports (takes remaining space, premium) */}
        <div ref={generatedRef} className="min-w-0">
          <Panel title="Generated reports" subtitle="Every export lands here — filters & pagination, premium list" bodyClassName="p-0" className="overflow-hidden">
            <div className="p-5 sm:p-6">
              <ReportList pending={pendingPayload} />
            </div>
          </Panel>
        </div>
      </div>

      <div className="mt-6">
        <Panel title="All transactions" subtitle="The raw rows behind every report — filtered by the period above">
          <PagedTransactions />
        </Panel>
      </div>

      {/* Professional queue - placed at bottom so a large queue never pushes the main export UI. Collapsed by default, shows count. */}
      {canGenerate && (
        <div className="mt-6">
          <Panel
            title={`Report Queue ${(() => { try { const s = typeof window !== "undefined" ? window.document.documentElement : null; return ""; } catch { return ""; } })()}`}
            subtitle="Background worker with concurrency 2 — even with 100 managers exporting at once, each request is queued and processed in order. Polls every 2s."
            bodyClassName="p-0"
            className="overflow-hidden"
          >
            <div className="p-5 sm:p-6">
              <ReportQueue />
              {activeJobId && (
                <p className="mt-3 text-xs text-ink-muted">
                  Active job <span className="font-mono font-medium text-ink">{activeJobId.slice(0, 8)}</span> — polling live. When status turns to Completed, the report appears in Generated reports and is ready to download.
                </p>
              )}
            </div>
          </Panel>
        </div>
      )}

      {showBuilder && <BuilderModal onClose={() => setShowBuilder(false)} initial={{ template, from: periodStart, to: periodEnd, format }} />}
      {showSchedule && <ScheduleModal onClose={() => setShowSchedule(false)} />}
    </>
  );
}
