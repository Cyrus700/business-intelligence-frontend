"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, queryKeys } from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import Icon from "@/components/ui/Icon";
import { useRole, hasMinRole } from "@/lib/use-role";

type Recommendation = {
  title: string;
  body: string;
  insight_type: string;
  severity: string;
  evidence: Record<string, unknown> | null;
};

const SEVERITY_STYLES: Record<string, { bg: string; text: string; icon: string }> = {
  warning: { bg: "bg-warn-50", text: "text-warn", icon: "alert" },
  info: { bg: "bg-primary-50", text: "text-primary", icon: "spark" },
};

function useRecommendations() {
  return useQuery<Recommendation[]>({
    queryKey: queryKeys.recommendations.list(),
    queryFn: () => apiGet<Recommendation[]>("/recommendations"),
    staleTime: 60_000,
  });
}

export default function RecommendationsClient() {
  const role = useRole();
  const canManage = hasMinRole(role, "manager");
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useRecommendations();

  const generateMutation = useMutation({
    mutationFn: () => apiPost<{ generated: number; new: number }>("/recommendations/generate", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recommendations.list() });
    },
  });

  const warnings = (data ?? []).filter((r) => r.severity === "warning");
  const info = (data ?? []).filter((r) => r.severity !== "warning");

  return (
    <>
      <PageHeader
        title="Recommendations"
        subtitle="AI-driven business recommendations based on your data. Updated daily."
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
          Viewing recommendations in read-only mode. Managers can trigger fresh generation.
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

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-sm text-ink-muted">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <span className="ml-2">Loading recommendations…</span>
        </div>
      ) : error ? (
        <div className="rounded-xl bg-warn-50 px-4 py-3 text-sm text-warn">
          {error instanceof Error ? error.message : "Failed to load recommendations"}
        </div>
      ) : warnings.length === 0 && info.length === 0 ? (
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
                  <RecommendationCard key={i} rec={r} />
                ))}
              </ul>
            </Panel>
          )}
          {info.length > 0 && (
            <Panel title="Opportunities" subtitle="Ways to improve performance">
              <ul className="space-y-3">
                {info.map((r, i) => (
                  <RecommendationCard key={i} rec={r} />
                ))}
              </ul>
            </Panel>
          )}
        </div>
      )}
    </>
  );
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const style = SEVERITY_STYLES[rec.severity] ?? SEVERITY_STYLES.info;
  return (
    <li className="flex gap-3 rounded-xl border border-border p-4">
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${style.bg} ${style.text}`}
      >
        <Icon name={style.icon as "alert" | "spark"} className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{rec.title}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">{rec.body}</p>
      </div>
    </li>
  );
}
