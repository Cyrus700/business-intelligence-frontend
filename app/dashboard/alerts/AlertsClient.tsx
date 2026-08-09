"use client";

import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import AiInsights from "@/components/dashboard/AiInsights";
import LiveAnomalies from "@/components/dashboard/live/LiveAnomalies";
import Icon from "@/components/ui/Icon";
import { useRole, hasMinRole } from "@/lib/use-role";
import { useApi } from "@/lib/api";
import type { AlertRuleOut } from "@/lib/api";

function AlertStatCards() {
  const rules = useApi<AlertRuleOut[]>("/alert-rules");
  const anomalies = useApi<unknown[]>("/anomalies", { status: "open", page_size: 50 });
  const activeRules = rules.data?.filter((r) => r.is_active).length ?? 0;
  const openAnomalies = anomalies.data?.length ?? 0;

  if (rules.loading || anomalies.loading) {
    return (
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-bg-soft" />
        ))}
      </div>
    );
  }

  return (
    <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-xl border border-border p-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Alert rules
        </span>
        <p className="mt-1 text-2xl font-semibold text-ink">{activeRules}</p>
        <p className="text-xs text-ink-soft">
          {activeRules === 1 ? "Active rule configured" : "Active rules configured"}
        </p>
      </div>
      <div className="rounded-xl border border-border p-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Anomalies (7d)
        </span>
        <p className="mt-1 text-2xl font-semibold text-warn">{openAnomalies}</p>
        <p className="text-xs text-ink-soft">
          {openAnomalies === 1 ? "Unacknowledged detection" : "Unacknowledged detections"}
        </p>
      </div>
      <div className="rounded-xl border border-border p-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Status
        </span>
        <p className="mt-1 text-2xl font-semibold text-ink">Live</p>
        <p className="text-xs text-ink-soft">Continuous monitoring</p>
      </div>
    </div>
  );
}

export default function AlertsClient() {
  const role = useRole();
  const canManage = hasMinRole(role, "manager");
  const isAdmin = hasMinRole(role, "admin");

  return (
    <>
      <PageHeader
        title="Alerts"
        subtitle="Anomalies detected by the ML engine. Acknowledge or dismiss as you triage."
        action={
          canManage && (
            <button className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-medium text-ink hover:bg-bg-soft">
              <Icon name="gear" className="h-4 w-4" />
              Alert rules
            </button>
          )
        }
      />

      {role === "analyst" && (
        <div className="mb-4 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
          You can view anomalies. Managers can dismiss alerts and manage alert rules.
        </div>
      )}

      {canManage && <AlertStatCards />}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Panel
          title="Anomaly feed"
          subtitle="All detections, newest first"
          className="md:col-span-2 xl:col-span-2"
          action={
            canManage ? (
              <span className="text-xs text-ink-muted">Click to dismiss</span>
            ) : undefined
          }
        >
          <LiveAnomalies manage={canManage} limit={20} />
        </Panel>
        <Panel title="Recommended actions" subtitle="Sample preview — live in Phase 5">
          <AiInsights />
        </Panel>
      </div>

      {isAdmin && (
        <div className="mt-4 rounded-xl border border-border bg-bg-soft p-4">
          <p className="text-sm text-ink-soft">
            <span className="font-medium text-ink">Admin:</span> Alert rule management and anomaly
            configuration are available from the alert rules panel.
          </p>
        </div>
      )}
    </>
  );
}
