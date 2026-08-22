"use client";

import { useEffect, useState } from "react";
import { getSystemHealth, getBusinessHealth, getAiUsage, type SystemHealthOut, type BusinessHealthOut, type AiUsageOut } from "@/lib/api";
import Panel from "@/components/dashboard/Panel";
import PageHeader from "@/components/dashboard/PageHeader";
import Badge from "@/components/ui/Badge";

export default function SystemHealthClient() {
  const [sysHealth, setSysHealth] = useState<SystemHealthOut | null>(null);
  const [bizHealth, setBizHealth] = useState<BusinessHealthOut | null>(null);
  const [aiUsage, setAiUsage] = useState<AiUsageOut | null>(null);
  const [loading, setLoading] = useState({ sys: true, biz: true, ai: true });
  const [error, setError] = useState({ sys: "", biz: "", ai: "" });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [sys, biz, ai] = await Promise.all([
          getSystemHealth(),
          getBusinessHealth(),
          getAiUsage(),
        ]);
        if (mounted) {
          setSysHealth(sys);
          setBizHealth(biz);
          setAiUsage(ai);
        }
      } catch (e) {
        if (mounted) {
          const msg = e instanceof Error ? e.message : String(e);
          setError({ sys: msg, biz: msg, ai: msg });
        }
      } finally {
        if (mounted) setLoading({ sys: false, biz: false, ai: false });
      }
    };
    load();
    const timer = setInterval(load, 60_000);
    return () => { mounted = false; clearInterval(timer); };
  }, []);

  const statusColor = (s: string) => s === "ok" ? "success" : s === "degraded" ? "warning" : "destructive";
  const statusLabel = (s: string) => s === "ok" ? "OK" : s === "degraded" ? "Degraded" : "Down";
  const fmtMs = (ms: number | null) => ms ? `${ms.toFixed(0)} ms` : "—";
  const fmtUsd = (usd: number) => `$${usd.toFixed(4)}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Health"
        subtitle="Platform component health, business health score, and AI usage monitoring."
      />

      {/* Business Health Score */}
      <Panel title="Business Health Score" subtitle={bizHealth ? `Overall: ${bizHealth.score}/100 — ${bizHealth.label}` : "Loading…"}>
        {loading.biz ? (
          <div className="text-center py-8 text-slate-500">Loading…</div>
        ) : error.biz ? (
          <div className="text-center py-8 text-red-500">Error: {error.biz}</div>
        ) : bizHealth ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-full border-4 flex items-center justify-center"
                style={{ borderColor:
                  bizHealth.label === "Healthy" ? "#22c55e" :
                  bizHealth.label === "Attention" ? "#f59e0b" : "#ef4444"
                }}>
                <span className="text-3xl font-bold"
                  style={{ color:
                    bizHealth.label === "Healthy" ? "#22c55e" :
                    bizHealth.label === "Attention" ? "#f59e0b" : "#ef4444"
                  }}>
                  {bizHealth.score}
                </span>
              </div>
              <div>
                <Badge variant={bizHealth.label === "Healthy" ? "success" : bizHealth.label === "Attention" ? "warning" : "destructive"}>
                  {bizHealth.label}
                </Badge>
                <p className="mt-1 text-sm text-slate-600">{bizHealth.formula}</p>
              </div>
            </div>
            <div className="overflow-x-auto"><table className="w-full text-sm">
<caption className="sr-only">System health details</caption>
<caption className="sr-only">System health scores</caption>
<caption className="sr-only">System health scores</caption>
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-2 pr-4" scope="col">Component</th>
                  <th className="pb-2 pr-4" scope="col">Weight</th>
                  <th className="pb-2 pr-4" scope="col">Score</th>
                  <th className="pb-2 pr-4" scope="col">Detail</th>
                </tr>
              </thead>
              <tbody>
                {bizHealth.components.map((c) => (
                  <tr key={c.name} className="border-b border-slate-100">
                    <td className="py-2 pr-4 font-medium">{c.name}</td>
                    <td className="py-2 pr-4">{(c.weight * 100).toFixed(0)}%</td>
                    <td className="py-2 pr-4">
                      <span className={c.score >= 75 ? "text-green-600" : c.score >= 50 ? "text-amber-600" : "text-red-600"}>
                        {c.score.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-slate-600">{c.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        ) : null}
      </Panel>

      {/* System Component Health */}
      <Panel title="Platform Component Health" subtitle={sysHealth ? `Overall: ${sysHealth.overall}` : "Loading…"}>
        {loading.sys ? (
          <div className="text-center py-8 text-slate-500">Loading…</div>
        ) : error.sys ? (
          <div className="text-center py-8 text-red-500">Error: {error.sys}</div>
        ) : sysHealth ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sysHealth.components.map((c) => (
                <div key={c.name} className="p-4 border rounded-lg bg-slate-50">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{c.name}</span>
                    <Badge variant={statusColor(c.status)}>{statusLabel(c.status)}</Badge>
                  </div>
                  <div className="mt-2 text-sm text-slate-600">{c.detail}</div>
                  {c.latency_ms !== null && (
                    <div className="mt-1 text-xs text-slate-500">Latency: {fmtMs(c.latency_ms)}</div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-4">
              Generated at: {new Date(sysHealth.generated_at).toLocaleString()}
            </p>
          </div>
        ) : null}
      </Panel>

      {/* AI Usage / Cost Monitoring */}
      <Panel title="AI Usage & Cost (Last 14 Days)" subtitle={aiUsage ? `Total est. cost: ${fmtUsd(aiUsage.total_est_cost_usd)}` : "Loading…"}>
        {loading.ai ? (
          <div className="text-center py-8 text-slate-500">Loading…</div>
        ) : error.ai ? (
          <div className="text-center py-8 text-red-500">Error: {error.ai}</div>
        ) : aiUsage ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="p-4 border rounded-lg bg-slate-50">
                <div className="text-2xl font-bold text-slate-900">{aiUsage.requests_14d}</div>
                <div className="text-sm text-slate-500">User Requests</div>
              </div>
              <div className="p-4 border rounded-lg bg-slate-50">
                <div className="text-2xl font-bold text-slate-900">{aiUsage.assistant_messages_14d}</div>
                <div className="text-sm text-slate-500">Assistant Messages</div>
              </div>
              <div className="p-4 border rounded-lg bg-slate-50">
                <div className="text-2xl font-bold text-slate-900">{aiUsage.active_users_14d}</div>
                <div className="text-sm text-slate-500">Active Users</div>
              </div>
              <div className="p-4 border rounded-lg bg-slate-50">
                <div className="text-2xl font-bold text-slate-900">{fmtUsd(aiUsage.total_est_cost_usd)}</div>
                <div className="text-sm text-slate-500">Est. Cost</div>
              </div>
            </div>
            <div className="overflow-x-auto"><table className="w-full text-sm">
<caption className="sr-only">System health details</caption>
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-2 pr-4" scope="col">Provider</th>
                  <th className="pb-2 pr-4" scope="col">Calls</th>
                  <th className="pb-2 pr-4" scope="col">Failures</th>
                  <th className="pb-2 pr-4" scope="col">Circuit</th>
                  <th className="pb-2 pr-4" scope="col">Avg Latency</th>
                  <th className="pb-2 pr-4" scope="col">Est. Cost</th>
                </tr>
              </thead>
              <tbody>
                {aiUsage.providers.map((p) => (
                  <tr key={p.provider} className="border-b border-slate-100">
                    <td className="py-2 pr-4 font-medium">{p.provider}</td>
                    <td className="py-2 pr-4">{p.calls}</td>
                    <td className="py-2 pr-4">{p.failures}</td>
                    <td className="py-2 pr-4">
                      <Badge variant={p.circuit_open ? "destructive" : "success"}>
                        {p.circuit_open ? "Open" : "Closed"}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4">{fmtMs(p.avg_latency_ms)}</td>
                    <td className="py-2 pr-4">{fmtUsd(p.est_cost_usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
            <p className="text-xs text-slate-500 mt-4">
              Generated at: {new Date(aiUsage.generated_at).toLocaleString()}
            </p>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}