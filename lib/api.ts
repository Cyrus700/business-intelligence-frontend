// Typed client for the BI backend API (business-intelligence-backend).

"use client";

import { useQuery } from "@tanstack/react-query";
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
  anomalies: { all: ["anomalies"] as const, list: (p?: object) => ["anomalies", "list", p] as const },
  trends: { all: ["trends"] as const, list: (p?: object) => ["trends", "list", p] as const },
  insights: { all: ["insights"] as const, list: (p?: object) => ["insights", "list", p] as const },
  recommendations: { all: ["recommendations"] as const, list: () => ["recommendations", "list"] as const },
  dataSources: { all: ["data-sources"] as const, list: () => ["data-sources", "list"] as const },
  etlJobs: { all: ["etl-jobs"] as const, list: () => ["etl-jobs", "list"] as const },
  uploads: { all: ["uploads"] as const, list: (page: number) => ["uploads", "list", page] as const },
  alerts: { all: ["alerts"] as const, rules: (p?: object) => ["alerts", "rules", p] as const },
  notifications: { all: ["notifications"] as const, list: (p?: object) => ["notifications", "list", p] as const },
  users: { all: ["users"] as const, list: () => ["users", "list"] as const, detail: (id: string) => ["users", "detail", id] as const },
  rbac: { all: ["rbac"] as const, matrix: () => ["rbac", "matrix"] as const, me: () => ["rbac", "me"] as const, audit: (limit: number) => ["rbac", "audit", limit] as const },
};

// ── Raw fetch helpers (used by useQuery + useMutation) ───────────

async function authHeaders(): Promise<Record<string, string>> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }
  const headers = await authHeaders();
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, String(body.detail ?? res.statusText));
  }
  return res.json() as Promise<T>;
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

export function useApi<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  queryKey?: unknown[],
  retry?: number | boolean,
) {
  const maxRetries = typeof retry === "number" ? retry : retry === true ? 2 : 0;
  const key = queryKey ?? [path, params];
  const { data, error, isLoading } = useQuery<T>({
    queryKey: key,
    queryFn: () => apiGet<T>(path, params),
    staleTime: 30_000,
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
  };
}

// ── user types (mirror app/schemas/identity.py) ────────────────

export type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "manager" | "analyst";
  department: string | null;
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

export async function getConversationMessages(convId: string): Promise<AIMessage[]> {
  return apiGet<AIMessage[]>(`/ai/conversations/${convId}/messages`);
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
};

export async function getReports(): Promise<ReportOut[]> {
  return apiGet<ReportOut[]>("/reports");
}

export async function generateReport(body: ReportRequest): Promise<ReportOut> {
  return apiPost<ReportOut>("/reports/generate", body);
}
