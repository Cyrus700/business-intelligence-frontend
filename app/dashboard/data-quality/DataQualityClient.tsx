"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  apiGet,
  getDqOverview,
  runDqAudit,
  updateDqIssue,
  type DqIssue,
  type DqOverview,
} from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import Icon from "@/components/ui/Icon";
import { hasMinRole, useRole } from "@/lib/use-role";

const DIMENSION_LABELS: Record<string, string> = {
  completeness: "Completeness",
  validity: "Validity",
  consistency: "Consistency",
  uniqueness: "Uniqueness",
  timeliness: "Timeliness",
  accuracy: "Accuracy",
};

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-red-50 text-red-700",
  warning: "bg-warn-50 text-warn",
  info: "bg-primary-50 text-primary",
};

const STATUS_STYLES: Record<string, string> = {
  open: "bg-warn-50 text-warn",
  acknowledged: "bg-blue-50 text-blue-700",
  resolved: "bg-green-50 text-green-700",
};

function useDqOverview() {
  return useQuery<DqOverview>({
    queryKey: ["data-quality", "overview"],
    queryFn: getDqOverview,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

function useDqIssues(filter: string | null) {
  return useQuery({
    queryKey: ["data-quality", "issues", filter],
    queryFn: () =>
      apiGet<{ items: DqIssue[]; total: number }>("/data-quality/issues", {
        status: filter ?? undefined,
        page_size: 50,
      }),
    staleTime: 15_000,
  });
}

export default function DataQualityClient() {
  const role = useRole();
  const canRun = hasMinRole(role, "manager");
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const { data: overview, isLoading, error } = useDqOverview();
  const issues = useDqIssues(statusFilter);

  const runMutation = useMutation({
    mutationFn: runDqAudit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-quality"] });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "acknowledged" | "resolved" }) =>
      updateDqIssue(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-quality"] });
    },
  });

  const latest = overview?.latest ?? null;

  return (
    <>
      <PageHeader
        title="Data Quality"
        subtitle="Measurable quality across completeness, validity, consistency, uniqueness, timeliness and accuracy."
        action={
          canRun ? (
            <button
              onClick={() => runMutation.mutate()}
              disabled={runMutation.isPending}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-medium text-ink hover:bg-bg-soft disabled:opacity-50"
            >
              <Icon name="refresh" className="h-4 w-4" />
              {runMutation.isPending ? "Auditing…" : "Run audit"}
            </button>
          ) : undefined
        }
      />

      {runMutation.isError && (
        <div className="mb-4 rounded-xl bg-warn-50 px-4 py-3 text-sm text-warn">
          Failed to run the quality audit. Try again shortly.
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-sm text-ink-muted">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <span className="ml-2">Running quality analysis…</span>
        </div>
      ) : error ? (
        <div className="rounded-xl bg-warn-50 px-4 py-3 text-sm text-warn">
          Failed to load data quality.
        </div>
      ) : (
        <div className="space-y-6">
          <Panel title="Quality score" subtitle={latest ? lastRunLabel(latest) : "No audit run yet"}>
            <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
              <ScoreRing score={latest?.score} />

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Dimension breakdown
                </p>
                {DIMENSION_ORDER.map((dim) => (
                  <DimensionBar
                    key={dim}
                    label={DIMENSION_LABELS[dim]}
                    score={latest?.dimensions?.[dim] ?? null}
                  />
                ))}
              </div>
            </div>

            {(overview?.open_issues ?? 0) > 0 && (
              <div className="mt-5 rounded-xl bg-warn-50 px-4 py-3 text-sm text-warn">
                {overview?.open_issues} open {overview?.open_issues === 1 ? "issue" : "issues"} need
                attention — see the list below.
              </div>
            )}
          </Panel>

          {latest && <ScoreHistory trend={overview?.trend ?? []} />}

          <Panel
            title="Issues"
            subtitle="Flagged quality problems — acknowledge or resolve them to track remediation."
          >
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {["open", "acknowledged", "resolved"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(statusFilter === status ? null : status)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                    statusFilter === status
                      ? "bg-primary text-white"
                      : "border border-border bg-white text-ink-soft hover:bg-bg-soft"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {issues.isLoading ? (
              <div className="py-10 text-center text-sm text-ink-muted">Loading issues…</div>
            ) : (issues.data?.items.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <Icon name="check" className="mb-2 h-8 w-8 text-green-600" />
                <p className="text-sm font-medium text-ink">No {statusFilter ? statusFilter : ""} issues</p>
                <p className="mt-1 text-sm text-ink-soft">
                  {latest?.score === 100
                    ? "All warehouse data passed the last audit."
                    : "Run a fresh audit to check the warehouse."}
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {(issues.data?.items ?? []).map((issue) => (
                  <IssueRow
                    key={issue.id}
                    issue={issue}
                    canResolve={canRun}
                    onResolve={(status) => resolveMutation.mutate({ id: issue.id, status })}
                    resolving={resolveMutation.isPending}
                  />
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </>
  );
}

const DIMENSION_ORDER = ["completeness", "validity", "consistency", "uniqueness", "timeliness", "accuracy"];

function lastRunLabel(run: NonNullable<DqOverview["latest"]>): string {
  const when = new Date(run.created_at).toLocaleString();
  return `${run.triggered_by === "manual" ? "Manual audit" : "Scheduled audit"} · ${when} · ${run.duration_ms} ms`;
}

function scoreColor(score: number | null | undefined): string {
  if (score == null) return "text-ink-muted";
  if (score >= 90) return "text-green-600";
  if (score >= 70) return "text-warn";
  return "text-red-600";
}

function ScoreRing({ score }: { score: number | null | undefined }) {
  const safe = score ?? 0;
  const pct = Math.min(100, Math.max(0, safe));
  const r = 90;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="relative h-52 w-52">
        <svg viewBox="0 0 220 220" className="h-full w-full -rotate-90">
          <circle cx="110" cy="110" r={r} fill="none" stroke="#eef2f7" strokeWidth="14" />
          <circle
            cx="110"
            cy="110"
            r={r}
            fill="none"
            stroke={pct >= 90 ? "#16a34a" : pct >= 70 ? "#f59e0b" : "#dc2626"}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * c} ${c}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-4xl font-bold ${scoreColor(score)}`}>
            {score == null ? "—" : `${score.toFixed(1)}%`}
          </span>
          <span className="mt-1 text-xs text-ink-muted">overall score</span>
        </div>
      </div>
      <p className="text-center text-xs leading-relaxed text-ink-soft">
        Weighted average of the six quality dimensions.
        <br />
        Missing required fields, duplicates and stale data lower the score.
      </p>
    </div>
  );
}

function DimensionBar({ label, score }: { label: string; score: number | null }) {
  const pct = score ?? 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-sm text-ink-soft">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-bg-soft">
        <div
          className={`h-full rounded-full ${pct >= 90 ? "bg-green-500" : pct >= 70 ? "bg-warn" : "bg-red-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`w-14 shrink-0 text-right text-sm font-medium ${scoreColor(score)}`}>
        {score == null ? "—" : `${score.toFixed(1)}%`}
      </span>
    </div>
  );
}

function ScoreHistory({ trend }: { trend: DqOverview["trend"] }) {
  const runs = trend.slice(0, 14).reverse();
  if (runs.length < 2) return null;
  const max = Math.max(...runs.map((r) => r.score), 100);
  return (
    <Panel title="Score history" subtitle="Last quality audits">
      <div className="flex h-32 items-end gap-1.5">
        {runs.map((run, i) => (
          <div key={run.id} className="group relative flex-1">
            <div
              className={`w-full rounded-t-md ${run.score >= 90 ? "bg-green-500" : run.score >= 70 ? "bg-warn" : "bg-red-500"}`}
              style={{ height: `${Math.max(4, (run.score / max) * 100)}%` }}
            />
            {i === runs.length - 1 && (
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-ink-muted">
                now
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-ink-muted">
        <span>{new Date(runs[0].created_at).toLocaleDateString()}</span>
        <span>{new Date(runs[runs.length - 1].created_at).toLocaleDateString()}</span>
      </div>
    </Panel>
  );
}

function IssueRow({
  issue,
  canResolve,
  onResolve,
  resolving,
}: {
  issue: DqIssue;
  canResolve: boolean;
  onResolve: (status: "acknowledged" | "resolved") => void;
  resolving: boolean;
}) {
  const sevStyle = SEVERITY_STYLES[issue.severity] ?? SEVERITY_STYLES.info;
  const statusStyle = STATUS_STYLES[issue.status] ?? STATUS_STYLES.open;
  return (
    <li className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${sevStyle}`}>
          {issue.severity}
        </span>
        <span className="rounded-full bg-bg-soft px-2.5 py-0.5 text-xs font-medium capitalize text-ink-soft">
          {DIMENSION_LABELS[issue.dimension] ?? issue.dimension}
        </span>
        <span className="rounded-full bg-bg-soft px-2.5 py-0.5 font-mono text-xs text-ink-soft">
          {issue.table_name}
        </span>
        <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyle}`}>
          {issue.status}
        </span>
      </div>
      <p className="mt-2 text-sm text-ink">{issue.description}</p>
      {issue.row_count > 1 && (
        <p className="mt-1 text-xs text-ink-muted">Affects {issue.row_count} rows</p>
      )}
      {issue.status !== "resolved" && canResolve && (
        <div className="mt-3 flex gap-2">
          {issue.status === "open" && (
            <button
              onClick={() => onResolve("acknowledged")}
              disabled={resolving}
              className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-xs font-medium text-ink hover:bg-bg-soft disabled:opacity-50"
            >
              Acknowledge
            </button>
          )}
          <button
            onClick={() => onResolve("resolved")}
            disabled={resolving}
            className="inline-flex h-8 items-center rounded-lg bg-green-600 px-3 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            Resolve
          </button>
        </div>
      )}
    </li>
  );
}