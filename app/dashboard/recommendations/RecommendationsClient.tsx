"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, queryKeys, type RecommendationOut, type DecisionBody } from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import Icon from "@/components/ui/Icon";
import { useRole, hasMinRole } from "@/lib/use-role";
import Badge from "@/components/ui/Badge";

const SEVERITY_STYLES: Record<string, { bg: string; text: string; icon: string }> = {
  warning: { bg: "bg-warn-50", text: "text-warn", icon: "alert" },
  info: { bg: "bg-primary-50", text: "text-primary", icon: "spark" },
  critical: { bg: "bg-destructive-50", text: "text-destructive", icon: "alert" },
};

const PRIORITY_STYLES: Record<string, { bg: string; text: string }> = {
  high: { bg: "bg-destructive-50", text: "text-destructive" },
  medium: { bg: "bg-warn-50", text: "text-warn" },
  low: { bg: "bg-primary-50", text: "text-primary" },
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  open: { bg: "bg-primary-50", text: "text-primary", label: "Open" },
  accepted: { bg: "bg-green-50", text: "text-green-700", label: "Accepted" },
  dismissed: { bg: "bg-slate-50", text: "text-slate-500", label: "Dismissed" },
  postponed: { bg: "bg-warn-50", text: "text-warn", label: "Postponed" },
  actioned: { bg: "bg-purple-50", text: "text-purple-700", label: "Actioned" },
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

export default function RecommendationsClient() {
  const role = useRole();
  const canManage = hasMinRole(role, "manager");
  const queryClient = useQueryClient();

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

  const warnings = (liveRecs ?? []).filter((r) => r.severity === "warning" || r.severity === "critical");
  const info = (liveRecs ?? []).filter((r) => r.severity === "info");

  return (
    <>
      <PageHeader
        title="Recommendations"
        subtitle="AI-driven business recommendations with impact estimates and decision tracking."
        action={
          canManage ? (
            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-medium text-ink hover:bg-bg-soft disabled:opacity-50"
            >
              <Icon name="spark" className="h-4 w-4" />
              {generateMutation.isPending ? "Generating…" : "Generate now"}
            </button>
          ) : undefined
        }
      />

      {role === "analyst" && (
        <p className="mb-4 text-sm text-ink-soft">
          Viewing recommendations in read-only mode. Managers can trigger fresh generation and make decisions.
        </p>
      )}

      {generateMutation.isError && (
        <div className="mb-4 rounded-xl bg-warn-50 px-4 py-3 text-sm text-warn">
          {generateMutation.error instanceof Error
            ? generateMutation.error.message
            : "Failed to generate recommendations"}
        </div>
      )}

      {generateMutation.isSuccess && (
        <div className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          Generated {generateMutation.data.generated} recommendations (
          {generateMutation.data.new} new).
        </div>
      )}

      {(loadingLive || loadingHistory) ? (
        <div className="flex items-center justify-center py-16 text-sm text-ink-muted">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <span className="ml-2">Loading recommendations…</span>
        </div>
      ) : errorLive ? (
        <div className="rounded-xl bg-warn-50 px-4 py-3 text-sm text-warn">
          {errorLive instanceof Error ? errorLive.message : "Failed to load recommendations"}
        </div>
      ) : warnings.length === 0 && info.length === 0 && (historyRecs ?? []).length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <Icon name="spark" className="mb-3 h-10 w-10 text-ink-muted" />
          <p className="text-sm font-medium text-ink">No recommendations yet</p>
          <p className="mt-1 text-sm text-ink-soft">
            {canManage
              ? "Click 'Generate now' to create recommendations from your data."
              : "Ask a manager to generate recommendations."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {warnings.length > 0 && (
            <Panel title="Action Required" subtitle="Items needing attention">
              <ul className="space-y-3">
                {warnings.map((r, i) => (
                  <RecommendationCard key={r.dedupe_key ?? i} rec={r} canDecide={canManage} onDecide={decideMutation.mutate} />
                ))}
              </ul>
            </Panel>
          )}
          {info.length > 0 && (
            <Panel title="Opportunities" subtitle="Ways to improve performance">
              <ul className="space-y-3">
                {info.map((r, i) => (
                  <RecommendationCard key={r.dedupe_key ?? i} rec={r} canDecide={canManage} onDecide={decideMutation.mutate} />
                ))}
              </ul>
            </Panel>
          )}
          {(historyRecs ?? []).length > 0 && (
            <Panel title="Decision History" subtitle="Previously generated recommendations with their status">
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
}: {
  rec: RecommendationOut;
  canDecide: boolean;
  onDecide: (vars: { insightId: string; decision: DecisionBody["decision"] }) => void;
}) {
  const style = SEVERITY_STYLES[rec.severity] ?? SEVERITY_STYLES.info;
  const priorityStyle = rec.priority ? PRIORITY_STYLES[rec.priority] : null;
  const statusStyle = rec.status ? STATUS_STYLES[rec.status] : null;
  const hasDecision = rec.id && rec.status && rec.status !== "open";

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border p-4">
      <div className="flex items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${style.bg} ${style.text}`}>
          <Icon name={style.icon as "alert" | "spark"} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-ink">{rec.title}</p>
            {rec.priority && (
              <Badge variant={priorityStyle!.text.replace("text-", "") as "success" | "warning" | "destructive" | "secondary"} className="text-xs">
                {rec.priority}
              </Badge>
            )}
            {rec.status && (
              <Badge variant={statusStyle!.text.replace("text-", "") as "success" | "warning" | "destructive" | "secondary"} className="text-xs">
                {statusStyle!.label}
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">{rec.body}</p>
          {rec.evidence && Object.keys(rec.evidence).length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-ink-muted cursor-pointer">Evidence</summary>
              <pre className="mt-1 text-xs bg-slate-50 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(rec.evidence, null, 2)}
              </pre>
            </details>
          )}
          {rec.impact_estimate && (
            <div className="mt-2 text-sm font-medium text-green-700">
              Expected impact: {rec.impact_estimate.toLocaleString()} NPR
              {rec.impact_basis && <span className="text-ink-muted font-normal ml-1">({rec.impact_basis})</span>}
            </div>
          )}
          {rec.action && (
            <div className="mt-2 text-sm text-blue-700">
              Recommended action: {rec.action}
            </div>
          )}
        </div>
      </div>
      {canDecide && !hasDecision && rec.id && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          {(["accepted", "dismissed", "postponed", "actioned"] as const).map((decision) => (
            <button
              key={decision}
              onClick={() => onDecide({ insightId: rec.id!, decision })}
              disabled={decideMutationPending()}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-white hover:bg-bg-soft disabled:opacity-50"
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
    <li className="flex items-start gap-3 rounded-xl border border-border p-4">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${style.bg} ${style.text}`}>
        <Icon name={style.icon as "alert" | "spark"} className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-ink">{rec.title}</p>
          {rec.priority && (
            <Badge variant={priorityStyle!.text.replace("text-", "") as "success" | "warning" | "destructive" | "secondary"} className="text-xs">
              {rec.priority}
            </Badge>
          )}
          {rec.status && (
            <Badge variant={statusStyle!.text.replace("text-", "") as "success" | "warning" | "destructive" | "secondary"} className="text-xs">
              {statusStyle!.label}
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">{rec.body}</p>
        {rec.impact_estimate && (
          <div className="mt-2 text-sm font-medium text-green-700">
            Expected impact: {rec.impact_estimate.toLocaleString()} NPR
            {rec.impact_basis && <span className="text-ink-muted font-normal ml-1">({rec.impact_basis})</span>}
          </div>
        )}
      </div>
    </li>
  );
}

// Simple pending check - could be enhanced with mutation state tracking
function decideMutationPending() {
  // In a real app, we'd track this via mutation state
  return false;
}