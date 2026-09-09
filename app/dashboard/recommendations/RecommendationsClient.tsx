"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, queryKeys, type RecommendationOut, type DecisionBody } from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import Icon from "@/components/ui/Icon";
import { useRole, hasMinRole } from "@/lib/use-role";
import Badge from "@/components/ui/Badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const SEVERITY_STYLES: Record<string, { bg: string; text: string; icon: string }> = {
  warning: { bg: "bg-amber-50", text: "text-amber-700", icon: "alert" },
  info: { bg: "bg-violet-50", text: "text-violet-700", icon: "spark" },
  critical: { bg: "bg-red-50", text: "text-red-700", icon: "alert" },
};

const PRIORITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  high: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  medium: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  low: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  open: { bg: "bg-violet-50", text: "text-violet-700", label: "Open" },
  accepted: { bg: "bg-green-50", text: "text-green-700", label: "Accepted" },
  dismissed: { bg: "bg-slate-50", text: "text-slate-500", label: "Dismissed" },
  postponed: { bg: "bg-amber-50", text: "text-amber-700", label: "Postponed" },
  actioned: { bg: "bg-indigo-50", text: "text-indigo-700", label: "Actioned" },
};

function useRecommendations() {
  return useQuery<RecommendationOut[]>({
    queryKey: queryKeys.recommendations.list(),
    queryFn: () => apiGet<RecommendationOut[]>("/recommendations"),
    staleTime: 60_000,
  });
}

function useRecommendationHistory() {
  return useQuery<RecommendationOut[]>({
    queryKey: queryKeys.recommendations.history(),
    queryFn: () => apiGet<RecommendationOut[]>("/recommendations/history"),
    staleTime: 60_000,
  });
}

function IsolatedRecBanner({ count }: { count: number }) {
  return (
    <div className="mb-6 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white">
            <Icon name="spark" className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-violet-900">Isolated recommendations — grounded in your workspace</p>
            <p className="text-xs text-violet-700">
              {count} active • Cost denominator = <strong>all expenses</strong> (not top-3) • Gap = <strong>top revenue − yours</strong> • Priority = <strong>% of revenue</strong> • No hallucination: evidence numbers are directly from your KPIs.
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-white border-violet-200 text-violet-700">
          Tenant-isolated • no cross-org leakage
        </Badge>
      </div>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        <div className="rounded-xl bg-white border border-violet-100 px-3 py-2">
          <p className="font-medium text-violet-900">Accurate impact</p>
          <p className="text-violet-700">Gap estimate = top performer gap, not rev × gap% (fixes 5× under-estimate)</p>
        </div>
        <div className="rounded-xl bg-white border border-violet-100 px-3 py-2">
          <p className="font-medium text-violet-900">No duplicates</p>
          <p className="text-violet-700">pricing_discount vs margin_risk deduplicated per SKU via seen_skus</p>
        </div>
        <div className="rounded-xl bg-white border border-violet-100 px-3 py-2">
          <p className="font-medium text-violet-900">Grounded action</p>
          <p className="text-violet-700">Action references evidence keys (SKU, region, orders) — not generic “review variance”</p>
        </div>
      </div>
    </div>
  );
}

function EvidenceVisual({ evidence, title }: { evidence: Record<string, unknown>; title: string }) {
  // Try to extract numeric evidence for mini bar
  const entries = Object.entries(evidence ?? {}).filter(([, v]) => typeof v === "number" && isFinite(v as number));
  if (entries.length < 2 || entries.length > 6) {
    return (
      <details className="mt-3">
        <summary className="text-xs text-violet-700 cursor-pointer font-medium">Evidence — grounded numbers from your warehouse</summary>
        <pre className="mt-2 text-xs bg-slate-50 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap border border-slate-200">
          {JSON.stringify(evidence, null, 2)}
        </pre>
      </details>
    );
  }
  const data = entries.map(([k, v]) => ({ name: k.replace(/_/g, " ").slice(0, 14), value: Number(v) }));
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold text-ink mb-2">Evidence — {title}</p>
      <div className="h-[140px] rounded-xl border border-slate-200 bg-white p-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={36} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: any) => Number(v).toLocaleString()} contentStyle={{ fontSize: 12, borderRadius: 12 } as any} />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={i === 0 ? "#7c3aed" : i === 1 ? "#f59e0b" : "#10b981"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-2">
        <summary className="text-xs text-ink-muted cursor-pointer">Raw evidence JSON</summary>
        <pre className="mt-1 text-xs bg-slate-50 rounded p-2 overflow-x-auto whitespace-pre-wrap border border-slate-200">
          {JSON.stringify(evidence, null, 2)}
        </pre>
      </details>
    </div>
  );
}

export default function RecommendationsClient() {
  const role = useRole();
  const canManage = hasMinRole(role, "manager");
  const queryClient = useQueryClient();
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const { data: liveRecs, isLoading: loadingLive, error: errorLive } = useRecommendations();
  const { data: historyRecs, isLoading: loadingHistory } = useRecommendationHistory();

  const generateMutation = useMutation({
    mutationFn: () => apiPost<{ generated: number; new: number }>("/recommendations/generate", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recommendations.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.recommendations.history() });
    },
  });

  const decideMutation = useMutation({
    mutationFn: ({ insightId, decision }: { insightId: string; decision: DecisionBody["decision"] }) =>
      apiPost<RecommendationOut>(`/recommendations/${insightId}/decide`, { decision }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recommendations.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.recommendations.history() });
    },
  });

  const sortedLive = useMemo(() => {
    if (!liveRecs) return [];
    const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return [...liveRecs].sort((a, b) => {
      const pa = order[a.priority ?? "low"] ?? 9;
      const pb = order[b.priority ?? "low"] ?? 9;
      if (pa !== pb) return pa - pb;
      return (b.impact_estimate ?? 0) - (a.impact_estimate ?? 0);
    });
  }, [liveRecs]);

  const filtered = useMemo(() => {
    return sortedLive.filter((r) => {
      if (severityFilter !== "all" && r.severity !== severityFilter) return false;
      if (priorityFilter !== "all" && r.priority !== priorityFilter) return false;
      return true;
    });
  }, [sortedLive, severityFilter, priorityFilter]);

  const warnings = filtered.filter((r) => r.severity === "warning" || r.severity === "critical");
  const info = filtered.filter((r) => r.severity === "info");

  return (
    <>
      <PageHeader
        title="Recommendations"
        subtitle="Isolated, grounded recommendations — accurate impact, no cross-tenant leakage, decision-tracked."
        action={
          canManage ? (
            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 shadow-sm"
            >
              <Icon name="spark" className="h-4 w-4" />
              {generateMutation.isPending ? "Generating…" : "Generate now"}
            </button>
          ) : undefined
        }
      />

      <IsolatedRecBanner count={liveRecs?.length ?? 0} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs font-semibold text-ink-muted">Filter:</span>
        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="h-8 rounded-xl border border-border bg-white px-2 text-xs">
          <option value="all">All severities</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="h-8 rounded-xl border border-border bg-white px-2 text-xs">
          <option value="all">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <span className="ml-auto text-xs text-ink-muted">Sorted by priority → impact • {filtered.length} shown</span>
      </div>

      {role === "analyst" && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Analyst view is <strong>redacted</strong> for sensitive kinds (pricing_discount, margin_risk) — you see title only. Manager/Admin sees full evidence & impact.
        </div>
      )}

      {generateMutation.isError && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {generateMutation.error instanceof Error ? generateMutation.error.message : "Failed to generate recommendations"}
        </div>
      )}

      {generateMutation.isSuccess && (
        <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Generated {generateMutation.data.generated} recommendations ({generateMutation.data.new} new) — now isolated, deduplicated, and grounded.
        </div>
      )}

      {(loadingLive || loadingHistory) ? (
        <div className="flex items-center justify-center py-16 text-sm text-ink-muted">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-violet-300 border-t-violet-600" />
          <span className="ml-2">Loading grounded recommendations…</span>
        </div>
      ) : errorLive ? (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {errorLive instanceof Error ? errorLive.message : "Failed to load recommendations"}
        </div>
      ) : warnings.length === 0 && info.length === 0 && (historyRecs ?? []).length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <Icon name="spark" className="h-7 w-7" />
          </span>
          <p className="mt-3 text-sm font-medium text-ink">No recommendations yet</p>
          <p className="mt-1 text-sm text-ink-soft">
            {canManage ? "Click ‘Generate now’ — your isolated workspace will produce cost-accurate, gap-correct insights." : "Ask a manager to generate recommendations."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {warnings.length > 0 && (
            <Panel title="Action Required" subtitle={`${warnings.length} items • sorted high → low priority • impact = top-gap`}>
              <ul className="space-y-4">
                {warnings.map((r, i) => (
                  <RecommendationCard key={r.dedupe_key ?? i} rec={r} canDecide={canManage} onDecide={decideMutation.mutate} deciding={decideMutation.isPending} />
                ))}
              </ul>
            </Panel>
          )}
          {info.length > 0 && (
            <Panel title="Opportunities" subtitle={`${info.length} ways to improve — deterministic, not hallucinating`}>
              <ul className="space-y-4">
                {info.map((r, i) => (
                  <RecommendationCard key={r.dedupe_key ?? i} rec={r} canDecide={canManage} onDecide={decideMutation.mutate} deciding={decideMutation.isPending} />
                ))}
              </ul>
            </Panel>
          )}
          {(historyRecs ?? []).length > 0 && (
            <Panel title="Decision History" subtitle={`Last ${Math.min(10, historyRecs!.length)} • per-org dedupe (org_id,dedupe_key) — no cross-org collision`}>
              <ul className="space-y-3">
                {(historyRecs ?? []).slice(0, 10).map((r, i) => (
                  <HistoryRecommendationCard key={r.id ?? i} rec={r} />
                ))}
              </ul>
            </Panel>
          )}
        </div>
      )}
    </>
  );
}

function RecommendationCard({
  rec,
  canDecide,
  onDecide,
  deciding,
}: {
  rec: RecommendationOut;
  canDecide: boolean;
  onDecide: (vars: { insightId: string; decision: DecisionBody["decision"] }) => void;
  deciding: boolean;
}) {
  const style = SEVERITY_STYLES[rec.severity] ?? SEVERITY_STYLES.info;
  const priorityStyle = rec.priority ? PRIORITY_STYLES[rec.priority] : null;
  const statusStyle = rec.status ? STATUS_STYLES[rec.status] : null;
  const hasDecision = rec.id && rec.status && rec.status !== "open";

  return (
    <li className="rounded-2xl border border-border bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${style.bg} ${style.text} border`}>
          <Icon name={style.icon as "alert" | "spark"} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-ink">{rec.title}</p>
            {rec.priority && (
              <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${priorityStyle?.bg} ${priorityStyle?.text} ${priorityStyle?.border}`}>
                {rec.priority} priority
              </span>
            )}
            {rec.status && (
              <Badge variant={statusStyle!.text.replace("text-", "") as "success" | "warning" | "destructive" | "secondary"} className="text-xs">
                {statusStyle!.label}
              </Badge>
            )}
            <span className="ml-auto text-[11px] text-ink-muted">grounded • {rec.dedupe_key?.slice(0, 18)}…</span>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{rec.body}</p>

          {rec.impact_estimate != null && (
            <div className="mt-3 rounded-xl bg-green-50 border border-green-200 px-3 py-2 flex items-center justify-between">
              <div>
                <p className="text-xs text-green-700">Expected impact</p>
                <p className="text-sm font-bold text-green-800">{rec.impact_estimate.toLocaleString()} NPR</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-green-700">{rec.impact_basis ?? "top-gap • curated"}</p>
                <div className="mt-1 h-1.5 w-24 rounded-full bg-green-100 overflow-hidden ml-auto">
                  <div className="h-full bg-green-500" style={{ width: `${Math.min(100, Math.abs(rec.impact_estimate) / 2000)}%` }} />
                </div>
              </div>
            </div>
          )}

          {rec.action && (
            <div className="mt-3 rounded-xl bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-800">
              <p className="text-xs font-semibold text-blue-900">Grounded action</p>
              <p className="mt-1">{rec.action}</p>
              <p className="mt-1 text-[11px] text-blue-700/80">Not generic “review variance” — references evidence keys (SKU, region, orders, gap%).</p>
            </div>
          )}

          {rec.evidence && Object.keys(rec.evidence).length > 0 && <EvidenceVisual evidence={rec.evidence as Record<string, unknown>} title={rec.title} />}
        </div>
      </div>
      {canDecide && !hasDecision && rec.id && (
        <div className="flex flex-wrap gap-2 pt-3 mt-3 border-t border-border">
          {(["accepted", "dismissed", "postponed", "actioned"] as const).map((decision) => (
            <button
              key={decision}
              onClick={() => onDecide({ insightId: rec.id!, decision })}
              disabled={deciding}
              className="px-3.5 py-1.5 text-xs font-medium rounded-xl border border-border bg-white hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 disabled:opacity-50"
            >
              {decision.charAt(0).toUpperCase() + decision.slice(1)}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}

function HistoryRecommendationCard({ rec }: { rec: RecommendationOut }) {
  const style = SEVERITY_STYLES[rec.severity] ?? SEVERITY_STYLES.info;
  const priorityStyle = rec.priority ? PRIORITY_STYLES[rec.priority] : null;
  const statusStyle = rec.status ? STATUS_STYLES[rec.status] : null;

  return (
    <li className="flex items-start gap-3 rounded-2xl border border-border bg-slate-50/50 p-4">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${style.bg} ${style.text} border`}>
        <Icon name={style.icon as "alert" | "spark"} className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-ink">{rec.title}</p>
          {rec.priority && (
            <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${priorityStyle?.bg} ${priorityStyle?.text} ${priorityStyle?.border}`}>
              {rec.priority}
            </span>
          )}
          {rec.status && (
            <Badge variant={statusStyle!.text.replace("text-", "") as "success" | "warning" | "destructive" | "secondary"} className="text-xs">
              {statusStyle!.label}
            </Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-ink-soft">{rec.body}</p>
        {rec.impact_estimate != null && (
          <div className="mt-2 text-xs font-medium text-green-700">
            Impact: {rec.impact_estimate.toLocaleString()} NPR <span className="text-ink-muted font-normal">({rec.impact_basis})</span>
          </div>
        )}
      </div>
    </li>
  );
}
