import type { Metadata } from "next";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import AiInsights from "@/components/dashboard/AiInsights";
import LiveAnomalies from "@/components/dashboard/live/LiveAnomalies";

export const metadata: Metadata = { title: "Alerts · Insightful" };

export default function AlertsPage() {
  return (
    <>
      <PageHeader
        title="Alerts"
        subtitle="Anomalies detected by the ML engine (Isolation Forest + seasonal z-score). Acknowledge or dismiss as you triage."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Anomaly feed" subtitle="All detections, newest first" className="lg:col-span-2">
          <LiveAnomalies manage limit={20} />
        </Panel>
        <Panel title="Recommended actions" subtitle="Sample preview — live in Phase 5">
          <AiInsights />
        </Panel>
      </div>
    </>
  );
}
