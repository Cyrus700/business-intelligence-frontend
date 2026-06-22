import type { Metadata } from "next";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import AnomalyFeed from "@/components/dashboard/AnomalyFeed";
import AiInsights from "@/components/dashboard/AiInsights";

export const metadata: Metadata = { title: "Alerts · Insightful" };

const SUMMARY = [
  { label: "Active alerts", value: "2", tone: "text-warn" },
  { label: "Resolved (7d)", value: "14", tone: "text-accent" },
  { label: "Avg. response", value: "8m", tone: "text-ink" },
];

export default function AlertsPage() {
  return (
    <>
      <PageHeader
        title="Alerts"
        subtitle="Anomalies detected across your business in real time."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {SUMMARY.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-white p-5 shadow-card">
            <p className="text-sm text-ink-soft">{s.label}</p>
            <p className={`mt-2 font-mono text-3xl font-semibold ${s.tone}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Anomaly feed" subtitle="Live" className="lg:col-span-2">
          <AnomalyFeed />
        </Panel>
        <Panel title="Recommended actions">
          <AiInsights />
        </Panel>
      </div>
    </>
  );
}
