"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import LiveAnomalies from "@/components/dashboard/live/LiveAnomalies";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import { clsx } from "@/lib/cx";
import { useCan } from "@/lib/use-role";
import { apiGet, apiPatch, queryKeys, useApi, npr } from "@/lib/api";
import type { AlertRuleOut } from "@/lib/api";
import {
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  testAlertRule,
  evaluateAlertRules,
  getNotifications,
  markNotificationRead,
} from "@/lib/api";
import { formatDateTime, timeAgo } from "@/app/dashboard/data/format";

// ── Multi-agent pipeline visual — professional, explains system to business users
function AgentPipeline() {
  const agents = [
    { key: "detect", label: "Detector", desc: "ML scans every night + on upload", icon: "search", color: "bg-primary text-white" },
    { key: "evaluate", label: "Evaluator", desc: "Checks thresholds & trends", icon: "activity", color: "bg-violet-600 text-white" },
    { key: "notify", label: "Notifier", desc: "Routes to your team & email", icon: "bell", color: "bg-amber-500 text-white" },
    { key: "history", label: "History", desc: "Audit trail for compliance", icon: "clock", color: "bg-emerald-600 text-white" },
  ];
  return (
    <div className="mb-4 rounded-xl border border-border bg-white px-3 py-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Alert pipeline — 4 agents working together</span>
        <Badge variant="secondary" className="ml-auto text-[11px]">Live • Asia/Kathmandu 03:00 + on upload</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {agents.map((a) => (
          <div key={a.key} className="flex items-center gap-2 rounded-xl border border-border bg-bg-soft/40 px-3 py-2.5">
            <span className={clsx("grid h-8 w-8 place-items-center rounded-full text-xs", a.color)}>
              <Icon name={a.icon as any} className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-ink">{a.label}</p>
              <p className="text-[11px] leading-tight text-ink-muted">{a.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertStatCards() {
  const rulesQ = useQuery<AlertRuleOut[]>({ queryKey: queryKeys.alerts.rules({}), queryFn: () => apiGet<AlertRuleOut[]>("/alert-rules"), staleTime: 30_000 });
  const anomaliesQ = useQuery<unknown[]>({ queryKey: ["anomalies", "open", "count"], queryFn: () => apiGet<unknown[]>("/anomalies", { status: "open", page_size: 1 }), staleTime: 30_000 });
  const notifsQ = useQuery({ queryKey: ["notifications", "unread"], queryFn: () => getNotifications(true), staleTime: 15_000, refetchInterval: 30_000 });

  const activeRules = rulesQ.data?.filter((r) => r.is_active).length ?? 0;
  const totalRules = rulesQ.data?.length ?? 0;
  const unread = (notifsQ.data as unknown[])?.length ?? 0;

  // Try to get last evaluation watermark — fallback to none
  const lastEval = "Nightly 03:00 + on every upload";

  if (rulesQ.isLoading) {
    return (
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-bg-soft" />
        ))}
      </div>
    );
  }

  return (
    <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
      <div className="rounded-xl border border-border p-4 bg-white">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Alert rules</span>
        <p className="mt-1 text-2xl font-semibold text-ink">{activeRules}<span className="text-sm font-normal text-ink-muted">/{totalRules}</span></p>
        <p className="text-xs text-ink-soft">{activeRules === 1 ? "Active rule" : "Active rules"} • {totalRules - activeRules} inactive</p>
      </div>
      <div className="rounded-xl border border-border p-4 bg-white">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Anomalies (open)</span>
        <p className="mt-1 text-2xl font-semibold text-warn">{(anomaliesQ.data as unknown[])?.length ?? "—"}</p>
        <p className="text-xs text-ink-soft">ML detections awaiting triage</p>
      </div>
      <div className="rounded-xl border border-border p-4 bg-white">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Notifications</span>
        <p className="mt-1 text-2xl font-semibold text-ink">{unread}</p>
        <p className="text-xs text-ink-soft">{unread ? "Unread — check bell" : "All caught up"}</p>
      </div>
      <div className="rounded-xl border border-border p-4 bg-white">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Schedule</span>
        <p className="mt-1 text-sm font-semibold text-ink">{lastEval}</p>
        <p className="text-xs text-ink-soft">Evaluator runs nightly + after each upload</p>
      </div>
    </div>
  );
}

// ── Rule Builder Modal (RuleManagerAgent UI)
function RuleModal({
  open,
  onClose,
  initial,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  initial?: AlertRuleOut | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    metric: initial?.metric ?? "revenue",
    condition: initial?.condition ?? "gt",
    threshold: initial?.threshold != null ? String(initial.threshold) : "",
    window_days: initial?.window_days ?? 7,
    channels: initial?.channels ?? { in_app: true },
    roles_notified: initial?.roles_notified ?? ["admin", "manager"],
  });
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<null | { would_fire: boolean; message: string | null; current_value: number }>(null);
  const [testing, setTesting] = useState(false);

  // keep form in sync when initial changes
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _sync = initial?.id;

  if (!open) return null;

  const isAnomaly = form.condition === "anomaly_detected";
  const metricOptions = [
    { v: "revenue", l: "Revenue", d: "Total sales revenue" },
    { v: "orders", l: "Orders", d: "Number of orders" },
    { v: "expense_total", l: "Expenses", d: "Total expenses" },
  ];
  const conditionOptions = [
    { v: "gt", l: "Above threshold (gt)", d: "Window sum > threshold" },
    { v: "lt", l: "Below threshold (lt)", d: "Window sum < threshold" },
    { v: "pct_change_gt", l: "Big change (± %)", d: "Change vs previous window exceeds %" },
    { v: "anomaly_detected", l: "Anomaly detected", d: "Any open ML anomaly in window" },
  ];

  const submit = async () => {
    setError(null);
    if (!form.name.trim() || form.name.trim().length < 3) return setError("Name must be at least 3 characters");
    if (!isAnomaly && (!form.threshold || Number.isNaN(Number(form.threshold)))) return setError("Threshold is required for this condition");
    if (form.window_days < 1 || form.window_days > 90) return setError("Window must be 1–90 days");
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        metric: form.metric,
        condition: form.condition,
        threshold: isAnomaly ? null : Number(form.threshold),
        window_days: Number(form.window_days),
        channels: form.channels,
        roles_notified: form.roles_notified,
      };
      if (initial?.id) await updateAlertRule(initial.id, payload as any);
      else await createAlertRule(payload as any);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  };

  const handleTest = async () => {
    if (!initial?.id) return setError("Save the rule first to test it");
    setTesting(true);
    setTestResult(null);
    try {
      const r = await testAlertRule(initial.id);
      setTestResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Test failed");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-sm font-semibold text-ink">{initial ? "Edit alert rule" : "New alert rule"} <span className="ml-2 text-xs font-normal text-ink-muted">RuleManagerAgent validates</span></h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-bg-soft"><Icon name="close" className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4 px-5 py-4">
          {error && <div className="rounded-xl border border-warn-200 bg-warn-50 px-3 py-2 text-sm text-warn">{error}</div>}
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink">Rule name *</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Revenue drop >10% this week" className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink">Metric</span>
              <select value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })} className="w-full rounded-xl border border-border px-3 py-2 text-sm bg-white">
                {metricOptions.map((o) => (
                  <option key={o.v} value={o.v}>{o.l} — {o.d}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink">Condition</span>
              <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className="w-full rounded-xl border border-border px-3 py-2 text-sm bg-white">
                {conditionOptions.map((o) => (
                  <option key={o.v} value={o.v}>{o.l}</option>
                ))}
              </select>
              <span className="mt-1 block text-[11px] text-ink-muted">{conditionOptions.find((o) => o.v === form.condition)?.d}</span>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink">Threshold {isAnomaly ? "(not needed)" : "*"}</span>
              <input type="number" disabled={isAnomaly} value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} placeholder={form.condition === "pct_change_gt" ? "10 = 10%" : "500000"} className="w-full rounded-xl border border-border px-3 py-2 text-sm disabled:bg-bg-soft" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink">Window (days) 1–90</span>
              <input type="number" min={1} max={90} value={form.window_days} onChange={(e) => setForm({ ...form, window_days: Number(e.target.value) })} className="w-full rounded-xl border border-border px-3 py-2 text-sm" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="mb-1 block text-xs font-medium text-ink">Channels</span>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!(form.channels as any).in_app} onChange={(e) => setForm({ ...form, channels: { ...(form.channels as any), in_app: e.target.checked } })} /> In-app (always)</label>
              <label className="flex items-center gap-2 text-sm mt-1"><input type="checkbox" checked={!!(form.channels as any).email} onChange={(e) => setForm({ ...form, channels: { ...(form.channels as any), email: e.target.checked } })} /> Email (if SMTP configured)</label>
            </div>
            <div>
              <span className="mb-1 block text-xs font-medium text-ink">Notify roles</span>
              {(["admin", "manager", "analyst"] as const).map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm capitalize"><input type="checkbox" checked={form.roles_notified.includes(r)} onChange={(e) => setForm({ ...form, roles_notified: e.target.checked ? [...form.roles_notified, r] : form.roles_notified.filter((x) => x !== r) })} /> {r}</label>
              ))}
            </div>
          </div>
          {testResult && (
            <div className={clsx("rounded-xl border px-3 py-2 text-sm", testResult.would_fire ? "border-amber-200 bg-amber-50 text-amber-800" : "border-green-200 bg-green-50 text-green-800")}>
              {testResult.would_fire ? `Would fire now — ${testResult.message ?? ""} (current ${npr(testResult.current_value)})` : `Would not fire — current ${npr(testResult.current_value)} within threshold`}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border px-5 py-4">
          <div className="flex gap-2">
            {initial?.id && (
              <button onClick={handleTest} disabled={testing} className="rounded-xl border border-border px-3 py-2 text-xs font-medium hover:bg-bg-soft disabled:opacity-50">
                {testing ? "Testing…" : "Test (dry-run)"}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm">Cancel</button>
            <button onClick={submit} className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-600">Save rule</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RulesPanel({ canManage }: { canManage: boolean }) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery<AlertRuleOut[]>({ queryKey: queryKeys.alerts.rules({}), queryFn: () => apiGet<AlertRuleOut[]>("/alert-rules") });
  const [editing, setEditing] = useState<AlertRuleOut | null>(null);
  const [creating, setCreating] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => updateAlertRule(id, { is_active } as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.alerts.rules({}) }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAlertRule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.alerts.rules({}) }),
  });
  const evaluateMutation = useMutation({
    mutationFn: () => evaluateAlertRules(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.alerts.rules({}) });
      qc.invalidateQueries({ queryKey: ["anomalies"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  if (isLoading) return <div className="h-32 animate-pulse rounded-xl bg-bg-soft" />;
  if (error) return <div className="rounded-xl border border-warn-200 bg-warn-50 p-3 text-sm text-warn">Failed to load rules — {(error as Error).message}</div>;

  const rules = data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-muted">{rules.length} rule{rules.length !== 1 ? "s" : ""} • cooldown 23h per rule to prevent spam</p>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              setEvaluating(true);
              try {
                const r = await evaluateMutation.mutateAsync();
                alert(`Evaluation done — ${r.notifications} notifications created`);
              } catch (e) {
                alert(e instanceof Error ? e.message : "Evaluate failed");
              } finally {
                setEvaluating(false);
              }
            }}
            disabled={evaluating || !canManage}
            className="rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-medium hover:bg-bg-soft disabled:opacity-50"
          >
            {evaluating ? "Evaluating…" : "Evaluate now"}
          </button>
          {canManage && (
            <button onClick={() => setCreating(true)} className="rounded-xl bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600">
              + New rule
            </button>
          )}
        </div>
      </div>

      {rules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <p className="text-sm font-medium text-ink">No alert rules yet</p>
          <p className="mt-1 text-xs text-ink-muted">Create your first rule — e.g. “Revenue &gt; Rs 500k in 7 days” or “Anomaly detected on revenue”.</p>
          {canManage && (
            <button onClick={() => setCreating(true)} className="mt-3 rounded-xl bg-primary px-4 py-2 text-xs font-medium text-white">Create rule</button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{r.name} {!r.is_active && <Badge variant="secondary" className="ml-2 text-[11px]">paused</Badge>}</p>
                <p className="text-xs text-ink-muted">
                  {r.metric} • {r.condition} {r.threshold != null ? `• ${npr(Number(r.threshold))}` : ""} • last {r.window_days}d • {r.roles_notified.join(", ")} • {r.channels && (r.channels as any).email ? "email" : "in-app"}
                </p>
                <p className="text-[11px] text-ink-muted">Created {timeAgo(r.created_at)} • <span title={formatDateTime(r.created_at)}>{formatDateTime(r.created_at)}</span></p>
              </div>
              <div className="flex items-center gap-1.5">
                {canManage && (
                  <>
                    <button onClick={() => toggleMutation.mutate({ id: r.id, is_active: !r.is_active })} className="rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-bg-soft">
                      {r.is_active ? "Pause" : "Resume"}
                    </button>
                    <button onClick={() => setEditing(r)} className="rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-bg-soft">Edit</button>
                    <button onClick={() => { if (confirm(`Delete "${r.name}"?`)) deleteMutation.mutate(r.id); }} className="rounded-lg border border-warn-200 px-2.5 py-1.5 text-xs text-warn hover:bg-warn-50">Delete</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <RuleModal
          open={true}
          initial={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => qc.invalidateQueries({ queryKey: queryKeys.alerts.rules({}) })}
        />
      )}
    </div>
  );
}

function NotificationsPanel() {
  const { data, isLoading, refetch } = useQuery({ queryKey: ["notifications", "all"], queryFn: () => getNotifications(false), staleTime: 15_000, refetchInterval: 30_000 });
  const qc = useQueryClient();
  const markAll = async () => {
    const unread = (data ?? []).filter((n: any) => !n.is_read);
    for (const n of unread) await markNotificationRead(n.id).catch(() => {});
    qc.invalidateQueries({ queryKey: ["notifications"] });
    refetch();
  };
  if (isLoading) return <div className="h-20 animate-pulse rounded-xl bg-bg-soft" />;
  const items = (data ?? []) as unknown as { id: string; title: string; body: string | null; is_read: boolean; created_at: string }[];
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-muted">{items.filter((i) => !i.is_read).length} unread • {items.length} total</p>
        {items.some((i) => !i.is_read) && (
          <button onClick={markAll} className="text-xs font-medium text-primary hover:underline">Mark all read</button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-ink-muted">No notifications — alerts will appear here when rules fire.</p>
      ) : (
        <ul className="space-y-2 max-h-96 overflow-auto pr-1">
          {items.slice(0, 20).map((n) => (
            <li key={n.id} className={clsx("rounded-xl border px-3 py-2 text-sm", n.is_read ? "border-border bg-white text-ink-soft" : "border-primary/20 bg-primary-50 text-ink")}>
              <p className="font-medium">{n.title}</p>
              {n.body && <p className="mt-0.5 text-xs opacity-80">{n.body}</p>}
              <p className="mt-1 text-[11px] text-ink-muted" title={formatDateTime(n.created_at)}>{timeAgo(n.created_at)} • {formatDateTime(n.created_at)} {!n.is_read && <button onClick={() => markNotificationRead(n.id).then(() => qc.invalidateQueries({ queryKey: ["notifications"] }))} className="ml-2 text-primary hover:underline">Mark read</button>}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AlertsClient() {
  const canManage = useCan("alert-rules:manage");
  const canTriage = useCan("anomalies:update");
  const [tab, setTab] = useState<"rules" | "anomalies" | "notifications" | "insights">("rules");

  return (
    <>
      <PageHeader
        title="Alerts"
        subtitle="Professional alerting — ML anomalies + threshold rules → notifications. Cooldown 23h prevents spam; evaluation nightly + on every upload."
        action={
          <div className="flex gap-2">
            <Badge variant="secondary" className="hidden sm:inline-flex">4 agents • live</Badge>
          </div>
        }
      />

      <AgentPipeline />
      <AlertStatCards />

      <div className="mb-4 flex gap-1.5 border-b border-border">
        {(["rules", "anomalies", "notifications", "insights"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx("rounded-t-lg px-3 py-2 text-xs font-medium capitalize", tab === t ? "bg-white border border-b-white border-border text-ink -mb-px" : "text-ink-muted hover:text-ink")}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "rules" && (
        <Panel title="Alert rules" subtitle="Threshold & anomaly rules → notifications (EvaluationAgent + NotificationAgent)">
          <RulesPanel canManage={canManage} />
        </Panel>
      )}
      {tab === "anomalies" && (
        <Panel title="Anomaly feed" subtitle="ML detections (Isolation Forest, z-score) — triage with AnomalyTriageAgent" action={canTriage ? <span className="text-xs text-ink-muted">Click to ack/dismiss</span> : undefined}>
          <LiveAnomalies manage={canTriage} limit={20} />
        </Panel>
      )}
      {tab === "notifications" && (
        <Panel title="Notifications" subtitle="Inbox for this account — 23h per-rule cooldown, respects email preferences">
          <NotificationsPanel />
        </Panel>
      )}
      {tab === "insights" && (
        <Panel title="AI insights" subtitle="Weekly narrative linked to alerts (InsightsEngine, cached 10m)">
          <div className="text-sm text-ink-soft">
            Insights are generated nightly alongside alerts — see{" "}
            <a href="/dashboard/recommendations" className="text-primary hover:underline">Recommendations</a> for alert-linked actions.
          </div>
        </Panel>
      )}

      {!canManage && (
        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          View-only: managers can create and manage alert rules, run evaluation, and triage anomalies.
        </div>
      )}
    </>
  );
}
