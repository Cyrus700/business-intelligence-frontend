// Typed client for the BI backend API (business-intelligence-backend).

"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getToken } from "@/lib/auth";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// ── Query key factory ────────────────────────────────────────────
// Centralised so mutations can invalidate by prefix.
export const queryKeys = {
  kpis: { all: ["kpis"] as const, summary: (p?: object) => ["kpis", "summary", p] as const, timeseries: (m: string, p?: object) => ["kpis", "timeseries", m, p] as const },
  sales: { all: ["sales"] as const, byProduct: (p?: object) => ["sales", "by-product", p] as const, byCategory: (p?: object) => ["sales", "by-category", p] as const, byChannel: (p?: object) => ["sales", "by-channel", p] as const, byRegion: (p?: object) => ["sales", "by-region", p] as const, transactions: (p?: object) => ["sales", "transactions", p] as const },
  finance: { all: ["finance"] as const, expenses: (p?: object) => ["finance", "expenses", p] as const, pnl: (p?: object) => ["finance", "pnl", p] as const },
  inventory: { all: ["inventory"] as const, levels: (p?: object) => ["inventory", "levels", p] as const },
  forecasts: { all: ["forecasts"] as const, list: (p?: object) => ["forecasts", "list", p] as const, accuracy: (p?: object) => ["forecasts", "accuracy", p] as const },
  mlModels: { all: ["ml-models"] as const, list: () => ["ml-models", "list"] as const },
  backtest: { all: ["backtest"] as const, list: (p?: object) => ["backtest", "list", p] as const },
  health: { all: ["health"] as const, business: () => ["health", "business"] as const, system: () => ["health", "system"] as const },
  aiUsage: { all: ["ai-usage"] as const, list: () => ["ai-usage", "list"] as const },
  anomalies: { all: ["anomalies"] as const, list: (p?: object) => ["anomalies", "list", p] as const },
  trends: { all: ["trends"] as const, list: (p?: object) => ["trends", "list", p] as const },
  insights: { all: ["insights"] as const, list: (p?: object) => ["insights", "list", p] as const },
  recommendations: { all: ["recommendations"] as const, list: () => ["recommendations", "list"] as const, history: () => ["recommendations", "history"] as const },
  dataSources: { all: ["data-sources"] as const, list: () => ["data-sources", "list"] as const },
  etlJobs: { all: ["etl-jobs"] as const, list: () => ["etl-jobs", "list"] as const },
  uploads: { all: ["uploads"] as const, list: (page: number) => ["uploads", "list", page] as const },
  alerts: { all: ["alerts"] as const, rules: (p?: object) => ["alerts", "rules", p] as const },
  notifications: { all: ["notifications"] as const, list: (p?: object) => ["notifications", "list", p] as const },
  users: { all: ["users"] as const, list: () => ["users", "list"] as const, detail: (id: string) => ["users", "detail", id] as const },
  businesses: { all: ["businesses"] as const, list: (p: object) => ["businesses", "list", p] as const, detail: (id: string) => ["businesses", "detail", id] as const },
  coverage: { all: ["coverage"] as const, data: () => ["coverage", "data"] as const },
  diagnostics: { all: ["diagnostics"] as const, change: (p?: object) => ["diagnostics", "change", p] as const },
  rbac: { all: ["rbac"] as const, matrix: () => ["rbac", "matrix"] as const, me: () => ["rbac", "me"] as const, audit: (limit: number) => ["rbac", "audit", limit] as const },
};

// ── Raw fetch helpers (used by useQuery + useMutation) ───────────

async function authHeaders(): Promise<Record<string, string>> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

/** Build the request URL with empty/undefined params dropped and keys sorted.
 *
 * Sorting matters beyond tidiness: it makes the URL a canonical identity for a
 * request, which is what both the in-flight coalescer below and the HTTP cache
 * key off. `{metric,from}` and `{from,metric}` must not be two requests. */
function buildUrl(path: string, params?: QueryParams): string {
  const url = new URL(`${BASE}${path}`);
  const entries = Object.entries(params ?? {})
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .sort(([a], [b]) => a.localeCompare(b));
  for (const [k, v] of entries) url.searchParams.set(k, String(v));
  return url.toString();
}

/** Canonical request params for a query key — same normalisation as the URL,
 * so two components asking for the same data share one cache entry. */
export function normalizeParams(params?: QueryParams): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
    if (v !== undefined && v !== null && v !== "") out[k] = String(v);
  }
  return out;
}

// Coalesces concurrent identical GETs into a single network request. React
// Query already dedupes within its own cache, but plenty of call sites use the
// raw helpers (auth bootstrap, imperative refreshes, non-hook modules) and
// several panels ask for the same URL on the same tick during first paint.
const inFlight = new Map<string, Promise<unknown>>();

export async function apiGet<T>(
  path: string,
  params?: QueryParams,
  signal?: AbortSignal,
): Promise<T> {
  const url = buildUrl(path, params);

  const send = async () => {
    const headers = await authHeaders();
    const res = await fetch(url, { headers, signal });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ detail: res.statusText }));
      throw new ApiError(res.status, String(body.detail ?? res.statusText));
    }
    return res.json() as Promise<T>;
  };

  // A cancellable caller owns its request outright — sharing it would let one
  // component's unmount abort another's still-needed fetch.
  if (signal) return send();

  // Key includes the token so a sign-in/out never serves the previous user's
  // in-flight response.
  const key = `${getToken() ?? ""}|${url}`;
  const pending = inFlight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const request = send().finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, request);
  return request;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, String(b.detail ?? res.statusText));
  }
  return res.json() as Promise<T>;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, String(b.detail ?? res.statusText));
  }
  return res.json() as Promise<T>;
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, String(b.detail ?? res.statusText));
  }
  return res.json() as Promise<T>;
}

// DELETE endpoints answer 204 with an empty body, so nothing is parsed.
export async function apiDelete(path: string): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}${path}`, { method: "DELETE", headers });
  if (!res.ok) {
    const b = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, String(b.detail ?? res.statusText));
  }
}

// ── useApi hook (backed by TanStack Query) ───────────────────────
// Replaces the old useState+useEffect implementation.
// All existing consumers get caching, dedup, retry, and refetch for free.

export type UseApiOptions = {
  /** How long a response stays fresh before a background refetch (ms). */
  staleTime?: number;
  /** Opt in to polling for genuinely live panels. Off by default — a global
   *  interval would multiply by every mounted panel. */
  refetchInterval?: number | false;
  /** Refetch when the tab regains focus (only while stale). Off by default. */
  refetchOnWindowFocus?: boolean;
  /** Skip the request entirely until a precondition is met (e.g. auth ready). */
  enabled?: boolean;
};

export function useApi<T>(
  path: string,
  params?: QueryParams,
  queryKey?: unknown[],
  retry?: number | boolean,
  options?: UseApiOptions,
) {
  const maxRetries = typeof retry === "number" ? retry : retry === true ? 2 : 0;
  // Normalised params in the key: components that request the same data with
  // differently-ordered or partly-empty param objects now hit one cache entry
  // instead of firing one request each.
  const key = queryKey ?? [path, normalizeParams(params)];
  const { data, error, isLoading, isFetching } = useQuery<T>({
    queryKey: key,
    queryFn: ({ signal }) => apiGet<T>(path, params, signal),
    staleTime: options?.staleTime,
    refetchInterval: options?.refetchInterval ?? false,
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    enabled: options?.enabled,
    // Keep the previous range's data on screen while the new range loads, so
    // changing the date filter doesn't blank every panel into a skeleton.
    placeholderData: keepPreviousData,
    retry: (failureCount, err) => {
      if (failureCount >= maxRetries) return false;
      if (err instanceof ApiError && err.status < 500) return false;
      return true;
    },
  });

  return {
    data: data ?? null,
    error: error ? (error instanceof ApiError ? error.message : "Request failed") : null,
    loading: isLoading,
    /** True during background refreshes too — for subtle "updating" affordances. */
    fetching: isFetching,
  };
}

// ── user types (mirror app/schemas/identity.py) ────────────────

export type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "manager" | "analyst";
  department: string | null;
  org_id: string | null;
  is_super_admin: boolean;
  is_active: boolean;
  created_at: string;
};

export type PaginatedUsers = {
  items: UserProfile[];
  total: number;
  page: number;
  page_size: number;
};

export type UserCreateBody = {
  email: string;
  password: string;
  full_name?: string | null;
  role: "admin" | "manager" | "analyst";
  department?: string | null;
};

export type UserUpdateBody = {
  full_name?: string | null;
  role?: "admin" | "manager" | "analyst";
  department?: string | null;
  is_active?: boolean | null;
};

// ---- response shapes (mirror app/schemas/analytics.py) ----

export type KpiCard = {
  metric: string;
  value: number;
  previous_value: number | null;
  change_pct: number | null;
};
export type KpiSummary = { period_start: string; period_end: string; cards: KpiCard[] };
export type TimeseriesPoint = { period: string; value: number };
export type Timeseries = { metric: string; granularity: string; points: TimeseriesPoint[] };
export type DimensionRow = {
  key: string;
  sku: string | null;
  quantity: number | null;
  orders: number;
  revenue: number;
  share_pct: number;
};
export type TrendRow = {
  metric: string;
  window_days: number;
  direction: "up" | "down" | "flat" | string;
  weekly_change_pct: number;
  strength_r: number;
  current_level: number;
};

export type RetrainResult = {
  retrained: { target: string; model: string; version: number; mape: number | null }[];
};

export async function retrainForecasts(): Promise<RetrainResult> {
  return apiPost<RetrainResult>("/forecasts/retrain", {});
}

export type TransactionRow = {
  id: number;
  txn_date: string;
  product: string | null;
  sku: string | null;
  customer: string | null;
  channel: string | null;
  region: string | null;
  quantity: number;
  unit_price: number;
  discount: number;
  total_amount: number;
  ingested_at?: string | null;
  etl_job_id?: string | null;
  source_id?: string | null;
  redacted?: boolean;
};
export type Paginated<T> = { items: T[]; total: number; page: number; page_size: number };
export type InventoryRow = {
  sku: string;
  product: string;
  category: string | null;
  snapshot_date: string;
  quantity_on_hand: number;
  reorder_level: number;
  below_reorder: boolean;
  warehouse: string | null;
};

// ── data coverage (mirrors app/schemas/analytics.py DataCoverage) ─────

export type TableCoverage = {
  first_date: string | null;
  last_date: string | null;
  row_count: number;
  last_ingested_at: string | null;
};

export type DataCoverage = {
  sales: TableCoverage;
  expenses: TableCoverage;
  inventory: TableCoverage;
  first_date: string | null;
  last_date: string | null;
  last_ingested_at: string | null;
  today: string;
  timezone: string;
  /** Days between the newest business date in the warehouse and today. */
  days_behind: number | null;
};

// ---- formatting ----

export function npr(value: number): string {
  return `रु ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value)}`;
}

export function nprCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e7) return `रु ${(value / 1e7).toFixed(1)} Cr`;
  if (abs >= 1e5) return `रु ${(value / 1e5).toFixed(1)} L`;
  if (abs >= 1e3) return `रु ${(value / 1e3).toFixed(0)}k`;
  return npr(value);
}

// ── AI types ──────────────────────────────────────────────────────

export type AIChatRequest = {
  conversation_id?: string;
  message: string;
  context?: Record<string, unknown>;
};

export type AIChatResponse = {
  conversation_id: string;
  reply: string;
};

export type AIConversation = {
  id: string;
  title: string;
  created_at: string;
  message_count: number;
};

export type AIMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

export type AIAnalyzeRequest = {
  question: string;
  data_context?: Record<string, unknown>;
};

export type AIAnalyzeResponse = {
  answer: string;
  suggestions: string[];
};

export type AIInsight = {
  title: string;
  body: string;
  type: string;
  priority: string;
};

// ── AI API functions ──────────────────────────────────────────────

export async function aiChat(body: AIChatRequest): Promise<AIChatResponse> {
  return apiPost<AIChatResponse>("/ai/chat", body);
}

export type ChatStreamEvents = {
  conversationId: string;
  onDelta: (text: string) => void;
};

// Streaming chat over the SSE endpoint. Resolves when the stream completes.
// Returns the final conversation id (also delivered via the first event).
export async function aiChatStream(
  body: AIChatRequest,
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}/ai/chat/stream`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, String(b.detail ?? res.statusText));
  }
  if (!res.body) throw new ApiError(0, "Streaming not supported by this browser");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let conversationId = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const raw of events) {
      const line = raw.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;
      let data: { conversation_id?: string; delta?: string; done?: boolean; error?: string };
      try {
        data = JSON.parse(payload);
      } catch {
        continue;
      }
      if (data.conversation_id) conversationId = data.conversation_id;
      if (data.delta) onDelta(data.delta);
      if (data.error) throw new ApiError(0, data.error);
      if (data.done) return conversationId;
    }
  }
  return conversationId;
}

export async function aiAnalyze(body: AIAnalyzeRequest): Promise<AIAnalyzeResponse> {
  return apiPost<AIAnalyzeResponse>("/ai/analyze", body);
}

export async function getConversations(): Promise<AIConversation[]> {
  return apiGet<AIConversation[]>("/ai/conversations");
}

export async function getConversationMessages(convId: string, params?: { limit?: number; offset?: number }): Promise<AIMessage[]> {
  return apiGet<AIMessage[]>(`/ai/conversations/${convId}/messages`, params as QueryParams);
}

export async function deleteConversation(convId: string): Promise<void> {
  return apiDelete(`/ai/conversations/${convId}`);
}

export async function flushConversations(): Promise<{ deleted: number }> {
  return apiDelete(`/ai/conversations`) as unknown as Promise<{ deleted: number }>;
}

export type RetentionOut = { retention_days: number; updated_at: string | null; updated_by: string | null; choices: number[]; is_disabled: boolean };
export async function getRetention(): Promise<RetentionOut> {
  return apiGet<RetentionOut>("/ai/retention");
}
export async function setRetention(days: number): Promise<RetentionOut> {
  return apiPost<RetentionOut>("/ai/retention", { retention_days: days });
}
export async function triggerRetentionFlush(): Promise<{ deleted: number; retention_days: number }> {
  return apiPost<{ deleted: number; retention_days: number }>("/ai/retention/flush", {});
}

export async function getAIInsights(scope?: string): Promise<AIInsight[]> {
  return apiGet<AIInsight[]>("/ai/insights", scope ? { scope } : undefined);
}

// ── Data Integration types ─────────────────────────────────────────

export type DataSource = {
  id: string;
  name: string;
  kind: "csv_upload" | "excel_upload" | "rest_api" | "postgres";
  target_domain: "sales" | "finance" | "inventory";
  config: Record<string, unknown>;
  schedule_cron: string | null;
  status: string;
  created_at: string;
};

export type UploadReport = {
  target_domain?: string;
  kind?: string;
  encoding?: string | null;
  columns?: string[];
  preview?: Array<Record<string, string>>;
  warnings?: string[];
  loaded?: number;
  rejected?: number;
  skipped_duplicates?: number;
  details?: Array<{ row: number; reason: string }>;
  file_size?: number;
  error?: string;
};

export type UploadRecord = {
  id: string;
  file_name: string;
  target_domain: "sales" | "finance" | "inventory" | null;
  status: string;
  row_count: number | null;
  error_report: UploadReport | null;
  created_at: string;
  etl_job_id: string | null;
};

export type PaginatedUploads = {
  items: UploadRecord[];
  total: number;
  page: number;
  page_size: number;
};

export type EtlJob = {
  id: string;
  data_source_id: string | null;
  trigger: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  rows_in: number | null;
  rows_loaded: number | null;
  rows_rejected: number | null;
  log: Record<string, unknown> | null;
};

// ── Data Integration API functions ──────────────────────────────────

export async function uploadFile(
  file: File,
  domain: string,
  dataSourceId?: string,
): Promise<UploadRecord> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const form = new FormData();
  form.append("file", file);
  form.append("domain", domain);
  if (dataSourceId) form.append("data_source_id", dataSourceId);

  const res = await fetch(`${BASE}/uploads`, { method: "POST", headers, body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, String(body.detail ?? res.statusText));
  }
  return res.json() as Promise<UploadRecord>;
}

export async function getUploads(params?: {
  status?: string;
  page?: number;
  page_size?: number;
}): Promise<PaginatedUploads> {
  return apiGet<PaginatedUploads>("/uploads", params);
}

export async function runEtlSource(sourceId: string): Promise<EtlJob> {
  return apiPost<EtlJob>(`/etl/run/${sourceId}`, undefined);
}

// ── P&L / Finance ────────────────────────────────────────────────

export type PnlRow = {
  month: string;
  revenue: number;
  expenses: number;
  gross_margin: number;
  net: number;
};

export async function getPnL(params?: Record<string, string | number | boolean | undefined>): Promise<PnlRow[]> {
  return apiGet<PnlRow[]>("/finance/pnl", params);
}

// ── Diagnostic analytics ─────────────────────────────────────────

export type DiagnosisMember = {
  key: string;
  current: number;
  previous: number;
  delta: number;
  contribution_pct: number;
  change_pct: number | null;
};

export type DiagnosisDimension = {
  members: DiagnosisMember[];
  drivers: string[];
  drags: string[];
  net_contribution: number;
};

export type Diagnosis = {
  metric: string;
  period: { from: string; to: string; span_days: number };
  comparison: { from: string; to: string };
  current: number;
  previous: number;
  delta: number;
  change_pct: number | null;
  direction: "up" | "down";
  dimensions: Record<string, DiagnosisDimension>;
  summary: {
    direction: "up" | "down";
    direction_word: string;
    primary_factor: string | null;
    secondary_factor: string | null;
    primary_contributor: { dimension: string; key: string; share: number } | null;
  };
};

export async function getDiagnosis(
  params?: Record<string, string | number | boolean | undefined>,
): Promise<Diagnosis> {
  return apiGet<Diagnosis>("/diagnostics/change", params);
}

// ── Alert rules ──────────────────────────────────────────────────

export type AlertRuleOut = {
  id: string;
  name: string;
  metric: string;
  condition: string;
  threshold: number | null;
  window_days: number;
  channels: Record<string, unknown>;
  roles_notified: string[];
  is_active: boolean;
  created_at: string;
};

export async function getAlertRules(): Promise<AlertRuleOut[]> {
  return apiGet<AlertRuleOut[]>("/alert-rules");
}

// ── Notifications ────────────────────────────────────────────────

export type NotificationOut = {
  id: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
};

export async function getNotifications(unread_only?: boolean): Promise<NotificationOut[]> {
  return apiGet<NotificationOut[]>("/notifications", { unread_only: unread_only ?? undefined });
}

// ── Reports ──────────────────────────────────────────────────────

export type ReportOut = {
  id: string;
  report_type: string;
  period_start: string;
  period_end: string;
  format: string;
  created_at: string;
};

export type ReportRequest = {
  period_start: string;
  period_end: string;
  format: "pdf" | "xlsx";
  email_me?: boolean;
};

export async function getReports(): Promise<ReportOut[]> {
  return apiGet<ReportOut[]>("/reports");
}

export type ReportJobOut = {
  id: string;
  status: "pending" | "claimed" | "succeeded" | "failed" | string;
  report_type?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  format?: string | null;
  created_at?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  report_id?: string | null;
  position?: number | null;
  total_in_queue?: number | null;
  estimated_wait_seconds?: number | null;
  error?: string | null;
};

export async function generateReport(body: ReportRequest): Promise<ReportJobOut> {
  return apiPost<ReportJobOut>("/reports/generate", body);
}

export async function getReportJobs(params?: { status?: string; limit?: number }): Promise<ReportJobOut[]> {
  return apiGet<ReportJobOut[]>("/reports/jobs", params as Record<string, string | number | boolean | undefined>);
}

export async function getReportJob(id: string): Promise<ReportJobOut> {
  return apiGet<ReportJobOut>(`/reports/jobs/${id}`);
}

// Reports require an Authorized bearer token, so a plain `<a href>` to the
// API 401s — the browser navigation carries no auth header. Fetch the file
// as a blob with the token attached, then trigger the save via an object URL.
export async function downloadReport(report: ReportOut): Promise<void> {
  const token = getToken();
  const res = await fetch(`${BASE}/reports/${report.id}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, String(b.detail ?? res.statusText));
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `report-${report.period_start}-${report.period_end}.${report.format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── Data Quality (Phase 3 upgrade) ──────────────────────────────

export type DqRun = {
  id: string;
  run_date: string;
  score: number;
  dimensions: Record<string, number>;
  breakdown: Record<string, unknown>;
  rows_checked: number;
  issues_found: number;
  triggered_by: string;
  duration_ms: number;
  status: string;
  created_at: string;
};

export type DqOverview = {
  latest: DqRun | null;
  trend: DqRun[];
  open_issues: number;
  by_severity: Record<string, number>;
  by_status: Record<string, number>;
  by_dimension: Record<string, number>;
};

export type DqIssue = {
  id: string;
  run_id: string;
  table_name: string;
  dimension: string;
  issue_type: string;
  severity: "info" | "warning" | "critical";
  status: "open" | "acknowledged" | "resolved";
  scope_key: string | null;
  scope_label: string | null;
  description: string;
  row_count: number;
  sample: Record<string, unknown> | null;
  created_at: string;
};

export type PaginatedDqIssues = {
  items: DqIssue[];
  total: number;
  page: number;
  page_size: number;
};

export async function getDqOverview(): Promise<DqOverview> {
  return apiGet<DqOverview>("/data-quality/overview");
}

export async function getDqIssues(params?: {
  dimension?: string;
  severity?: string;
  status?: string;
  table?: string;
  page?: number;
  page_size?: number;
}): Promise<PaginatedDqIssues> {
  return apiGet<PaginatedDqIssues>("/data-quality/issues", params);
}

export async function runDqAudit(): Promise<DqRun> {
  return apiPost<DqRun>("/data-quality/run", {});
}

export async function updateDqIssue(id: string, status: "acknowledged" | "resolved"): Promise<DqIssue> {
  return apiPatch<DqIssue>(`/data-quality/issues/${id}`, { status });
}

// ── Report schedules ────────────────────────────────────────────

export type ReportScheduleOut = {
  id: string;
  frequency: "weekly" | "monthly";
  format: "pdf" | "xlsx";
  day_of_week: number | null;
  day_of_month: number | null;
  is_active: boolean;
  next_run_at: string;
  last_run_at: string | null;
  last_report_id: string | null;
  created_at: string;
};

export type ReportScheduleRequest = {
  frequency: "weekly" | "monthly";
  format: "pdf" | "xlsx";
  day_of_week?: number | null;
  day_of_month?: number | null;
};

export type ReportScheduleUpdate = {
  format?: "pdf" | "xlsx";
  day_of_week?: number | null;
  day_of_month?: number | null;
  is_active?: boolean;
};

export async function getReportSchedules(): Promise<ReportScheduleOut[]> {
  return apiGet<ReportScheduleOut[]>("/report-schedules");
}

export async function createReportSchedule(
  body: ReportScheduleRequest,
): Promise<ReportScheduleOut> {
  return apiPost<ReportScheduleOut>("/report-schedules", body);
}

export async function updateReportSchedule(
  id: string,
  body: ReportScheduleUpdate,
): Promise<ReportScheduleOut> {
  return apiPatch<ReportScheduleOut>(`/report-schedules/${id}`, body);
}

export async function deleteReportSchedule(id: string): Promise<void> {
  return apiDelete(`/report-schedules/${id}`);
}

// ── KPI Definitions (Phase 5) ──────────────────────────────────────

export type KpiDefinition = {
  metric: string;
  label: string;
  unit: string;
  formula: string;
  target_value: number | null;
  threshold_value: number | null;
  higher_is_better: boolean;
  visibility: string[];
  owner_role: string | null;
};

export type KpiDefinitionUpdate = {
  label?: string;
  target_value?: number | null;
  threshold_value?: number | null;
  higher_is_better?: boolean;
  visibility?: string[];
  owner_role?: string | null;
};

export async function getKpiDefinitions(): Promise<KpiDefinition[]> {
  return apiGet<KpiDefinition[]>("/kpis/definitions");
}

export async function updateKpiDefinition(
  metric: string,
  body: KpiDefinitionUpdate,
): Promise<KpiDefinition> {
  return apiPatch<KpiDefinition>(`/kpis/definitions/${metric}`, body);
}

// Extended KpiCard with target/achievement/status (from backend KpiSummary response)
export type KpiCardExtended = KpiCard & {
  label: string;
  unit: string;
  target_value: number | null;
  achievement_pct: number | null;
  status: "on_track" | "near_target" | "off_target" | null;
};

export type KpiSummaryExtended = { period_start: string; period_end: string; cards: KpiCardExtended[] };

// ── ML Model Registry & Backtest (Phase 6) ─────────────────────────

export type MlModelOut = {
  id: string;
  model_type: string;
  target: string;
  dimensions: Record<string, unknown>;
  version: number;
  trained_at: string;
  training_rows: number | null;
  metrics: Record<string, unknown> | null;
  params: Record<string, unknown> | null;
  is_active: boolean;
  activated_at: string | null;
  retired_at: string | null;
  dataset_start: string | null;
  dataset_end: string | null;
};

export type BacktestStep = {
  step: number;
  train_end: string;
  mape: number;
  mae: number;
};

export type BacktestModel = {
  mape_avg: number;
  mape_worst: number;
  steps: BacktestStep[];
  steps_ok: number;
  failures: number;
};

export type BacktestOut = {
  horizon: number;
  steps: number;
  models: Record<string, BacktestModel>;
};

export async function getMlModels(): Promise<MlModelOut[]> {
  return apiGet<MlModelOut[]>("/ml/models");
}

export async function retireMlModel(modelId: string): Promise<MlModelOut> {
  return apiPost<MlModelOut>(`/ml/models/${modelId}/retire`, {});
}

export async function getBacktest(params?: { horizon?: number; steps?: number }): Promise<BacktestOut> {
  return apiGet<BacktestOut>("/ml/backtest", params);
}

// ── Business Health Score & System Health (Phase 11) ──────────────

export type HealthComponent = {
  name: string;
  weight: number;
  score: number;
  detail: string;
};

export type BusinessHealthOut = {
  score: number;
  label: "Healthy" | "Attention" | "Critical";
  formula: string;
  components: HealthComponent[];
};

export type SystemComponent = {
  name: string;
  status: "ok" | "degraded" | "down";
  latency_ms: number | null;
  detail: string;
};

export type SystemHealthOut = {
  generated_at: string;
  components: SystemComponent[];
  overall: "ok" | "degraded" | "down";
};

export async function getBusinessHealth(): Promise<BusinessHealthOut> {
  return apiGet<BusinessHealthOut>("/health/business");
}

export async function getSystemHealth(): Promise<SystemHealthOut> {
  return apiGet<SystemHealthOut>("/health/system");
}

// ── AI Usage / Cost Monitoring (Phase 11) ──────────────────────────

export type UsageRow = {
  provider: string;
  calls: number;
  failures: number;
  circuit_open: boolean;
  avg_latency_ms: number;
  est_cost_usd: number;
};

export type AiUsageOut = {
  generated_at: string;
  providers: UsageRow[];
  requests_14d: number;
  assistant_messages_14d: number;
  active_users_14d: number;
  total_est_cost_usd: number;
};

export async function getAiUsage(): Promise<AiUsageOut> {
  return apiGet<AiUsageOut>("/ai/usage");
}

// ── Recommendations Decision Workflow (Phase 8) ───────────────────

export type RecommendationOut = {
  id: string | null;
  title: string;
  body: string;
  insight_type: string;
  severity: string;
  evidence: Record<string, unknown> | null;
  dedupe_key: string | null;
  impact_estimate: number | null;
  impact_basis: string | null;
  priority: "high" | "medium" | "low" | null;
  action: string | null;
  status: "open" | "accepted" | "dismissed" | "postponed" | "actioned" | null;
};

export type DecisionBody = {
  decision: "accepted" | "dismissed" | "postponed" | "actioned";
};

export async function getRecommendationHistory(): Promise<RecommendationOut[]> {
  return apiGet<RecommendationOut[]>("/recommendations/history");
}

export async function decideRecommendation(
  insightId: string,
  decision: DecisionBody["decision"],
): Promise<RecommendationOut> {
  return apiPost<RecommendationOut>(`/recommendations/${insightId}/decide`, { decision });
}

// ── Organizations & Invites (multi-tenant) ────────────────────────────────

export type OrganizationOut = { id: string; name: string; slug: string | null; is_legacy: boolean; is_personal?: boolean; status?: string; approved_at?: string | null; approved_by?: string | null; rejected_at?: string | null; rejected_by?: string | null; rejection_reason?: string | null; created_at: string; updated_at?: string | null; contact_email?: string | null; contact_name?: string | null };
export type InviteOut = { id: string; org_id: string; email: string | null; role: string; token: string; expires_at: string; accepted_at: string | null; created_at: string };

export type BusinessOut = OrganizationOut & {
  contact_email: string | null;
  contact_name: string | null;
  contact_email_verified: boolean | null;
  member_count: number;
  is_personal: boolean;
  slug: string | null;
};

export type PaginatedBusinesses = {
  items: BusinessOut[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
  counts: Record<string, number>;
};

export type BusinessDetailOut = BusinessOut & {
  updated_at?: string | null;
};

export async function getOrganizations(): Promise<OrganizationOut[]> {
  return apiGet<OrganizationOut[]>("/auth/organizations");
}

/** Shared org list for the whole chrome.
 *
 * The topbar, the overview header and the super-admin switcher all need it;
 * before this hook each held its own query key and the page issued three
 * identical `/auth/organizations` requests. Org membership barely changes
 * within a session, so it is cached aggressively. */
export function useOrganizations(enabled = true) {
  return useQuery<OrganizationOut[]>({
    queryKey: ["organizations"],
    queryFn: ({ signal }) => apiGet<OrganizationOut[]>("/auth/organizations", undefined, signal),
    enabled,
    staleTime: 15 * 60_000,
  });
}
export async function createInvite(body: { email?: string; role: string }): Promise<InviteOut> {
  return apiPost<InviteOut>("/auth/invite", body);
}
export async function getInvites(): Promise<InviteOut[]> {
  return apiGet<InviteOut[]>("/auth/invites");
}
export async function getInviteByToken(token: string): Promise<InviteOut> {
  return apiGet<InviteOut>(`/auth/invites/${token}`);
}
export async function registerBusiness(body: { org_name: string; email: string; password: string; full_name?: string | null }): Promise<{ token: string | null; user: UserProfile | null; organization: OrganizationOut; status: string; message?: string | null }> {
  return apiPost("/auth/register-org", body);
}

export async function getBusinesses(params?: {
  status?: string;
  search?: string;
  page?: number;
  page_size?: number;
}): Promise<PaginatedBusinesses> {
  return apiGet<PaginatedBusinesses>("/auth/admin/organizations", params as Record<string, string | number | boolean | undefined>);
}

export async function getBusiness(id: string): Promise<BusinessDetailOut> {
  return apiGet<BusinessDetailOut>(`/auth/admin/organizations/${id}`);
}

export async function approveBusiness(id: string): Promise<BusinessOut> {
  return apiPost<BusinessOut>(`/auth/admin/organizations/${id}/approve`, {});
}

export async function rejectBusiness(id: string, reason?: string): Promise<BusinessOut> {
  return apiPost<BusinessOut>(`/auth/admin/organizations/${id}/reject`, { reason });
}
