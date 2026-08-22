"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet, queryKeys, npr, nprCompact, type BusinessHealthOut } from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/Icon";
import { clsx } from "@/lib/cx";
import { useFilters, RangePicker, apiParams } from "@/lib/filters";

function HealthGauge({ score, label }: { score: number; label: "Healthy" | "Attention" | "Critical" }) {
  const color = label === "Healthy" ? "#22c55e" : label === "Attention" ? "#f59e0b" : "#ef4444";
  const bg = label === "Healthy" ? "bg-green-50" : label === "Attention" ? "bg-warn-50" : "bg-destructive-50";
  return (
    <div className="flex items-center gap-4">
      <div className="w-20 h-20 rounded-full border-4 flex items-center justify-center" style={{ borderColor: color }}>
        <span className="text-2xl font-bold" style={{ color }}>{Math.round(score)}</span>
      </div>
      <div>
        <Badge variant={label === "Healthy" ? "success" : label === "Attention" ? "warning" : "destructive"} className="text-xs">
          {label}
        </Badge>
        <p className="mt-1 text-xs text-ink-soft">Business Health Score</p>
      </div>
    </div>
  );
}

function KpiMetric({ label, value, change, unit = "NPR" }: { label: string; value: number; change?: number | null; unit?: string }) {
  const changeColor = change === null || change === undefined ? "text-ink-muted" : change >= 0 ? "text-green-600" : "text-warn";
  const format = unit === "%" ? (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%` : npr;
  return (
    <div className="p-4 bg-white rounded-xl border border-border">
      <p className="text-xs font-medium text-ink-soft">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink">{format(value)}</p>
      {change !== undefined && (
        <p className="mt-1 text-sm font-medium {changeColor}">
          {change !== null ? (change >= 0 ? "+" : "") + change.toFixed(1) + (unit === "%" ? "%" : "") : "—"}
          <span className="text-ink-muted font-normal ml-1">vs prior period</span>
        </p>
      )}
    </div>
  );
}

function RiskItem({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-warn-50 rounded-xl">
      <Icon name="alert" className="mt-0.5 h-4 w-4 text-warn shrink-0" />
      <div>
        <p className="text-sm font-medium text-warn">{title}</p>
        <p className="text-xs text-ink-soft">{detail}</p>
      </div>
    </div>
  );
}

export default function ExecutiveClient() {
  const { filters } = useFilters();

  const { data: health } = useQuery<BusinessHealthOut>({
    queryKey: ["health", "business"],
    queryFn: () => apiGet<BusinessHealthOut>("/health/business"),
    staleTime: 60_000,
  });

  const { data: kpiSummary } = useQuery<{ period_start: string; period_end: string; cards: Array<{ metric: string; value: number; change_pct: number | null; achievement_pct?: number | null; status?: string }> }>({
    queryKey: ["kpis", "summary"],
    queryFn: () => apiGet("/kpis/summary"),
    staleTime: 30_000,
  });

  const { data: pnl } = useQuery<Array<{ month: string; revenue: number; expenses: number; gross_margin: number; net: number }>>({
    queryKey: ["finance", "pnl", apiParams(filters)],
    queryFn: () => apiGet("/finance/pnl", apiParams(filters)),
    staleTime: 60_000,
  });

  const { data: forecast } = useQuery<{ points: Array<{ yhat: number }> } | null>({
    queryKey: ["forecasts", "list", apiParams(filters)],
    queryFn: () => apiGet("/forecasts", apiParams(filters)),
    staleTime: 60_000,
  });

  const { data: anomalies } = useQuery<Array<any>>({
    queryKey: ["anomalies", "list", { status: "open" }],
    queryFn: () => apiGet("/anomalies", { status: "open", page_size: 5 }),
    staleTime: 60_000,
  });

  const revenue = kpiSummary?.cards.find((c: any) => c.metric === "revenue");
  const grossMargin = kpiSummary?.cards.find((c: any) => c.metric === "gross_margin");
  const orders = kpiSummary?.cards.find((c: any) => c.metric === "orders");
  const expenseTotal = kpiSummary?.cards.find((c: any) => c.metric === "expense_total");

  const latestMonth = pnl?.[pnl.length - 1];
  const prevMonth = pnl?.[pnl.length - 2];
  const revenueChange = latestMonth && prevMonth && prevMonth.revenue > 0
    ? ((latestMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100
    : null;
  const profitChange = latestMonth && prevMonth && prevMonth.net > 0
    ? ((latestMonth.net - prevMonth.net) / prevMonth.net) * 100
    : null;

  const forecastTotal = forecast?.points?.reduce((sum: number, p: any) => sum + p.yhat, 0) || 0;
  const openAnomalies = anomalies?.length || 0;

  // Derive top risks
  const risks: { title: string; detail: string }[] = [];
  if (openAnomalies > 0) risks.push({ title: `${openAnomalies} open anomaly${openAnomalies > 1 ? "s" : ""}`, detail: "Review anomaly feed for drivers" });
  if (health && health.score < 75) risks.push({ title: "Health score below threshold", detail: `Overall score ${health.score}/100 — ${health.label}` });
  if (revenue && revenue.achievement_pct !== null && revenue.achievement_pct !== undefined && revenue.achievement_pct < 100) risks.push({ title: "Revenue off target", detail: `Achievement ${revenue.achievement_pct!.toFixed(1)}%` });
  if (grossMargin && grossMargin.value !== null && grossMargin.value !== undefined && grossMargin.value < 20) risks.push({ title: "Margin compression", detail: `Margin ${grossMargin.value!.toFixed(1)}%` });
  if (pnl && latestMonth && latestMonth.net < 0) risks.push({ title: "Negative net profit", detail: `${npr(latestMonth.net)} this period` });
  if (risks.length === 0) risks.push({ title: "No immediate risks", detail: "All key metrics within acceptable ranges" });

  return (
    <>
      <PageHeader
        title="Executive Dashboard"
        subtitle="30-second overview: health, revenue, profit, growth, forecast, risks"
        action={<RangePicker />}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-6">
        {health && <div className="xl:col-span-2"><Panel title="Business Health"><HealthGauge score={health.score} label={health.label} /></Panel></div>}
        <Panel title="Revenue (Month)"><KpiMetric label="Revenue" value={latestMonth?.revenue || 0} change={revenueChange} /></Panel>
        <Panel title="Net Profit (Month)"><KpiMetric label="Net Profit" value={latestMonth?.net || 0} change={profitChange} /></Panel>
        <Panel title="Gross Margin"><KpiMetric label="Margin" value={latestMonth && latestMonth.revenue > 0 ? (latestMonth.gross_margin / latestMonth.revenue) * 100 : 0} unit="%" /></Panel>
        <Panel title="Orders"><KpiMetric label="Orders" value={orders?.value || 0} change={orders?.change_pct} unit="count" /></Panel>
        <Panel title="Expenses"><KpiMetric label="Total Expenses" value={expenseTotal?.value || 0} change={expenseTotal?.change_pct} /></Panel>
        <Panel title="30-Day Forecast"><KpiMetric label="Projected Revenue" value={forecastTotal} /></Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="P&L Trend" subtitle="Last 6 months" className="lg:col-span-2">
          {pnl && pnl.length > 0 ? (
            <div className="space-y-2">
              {pnl.slice(-6).map((row: any) => (
                <div key={row.month} className="flex items-center justify-between text-sm">
                  <span className="text-ink-soft">{row.month}</span>
                  <div className="flex gap-4 text-right">
                    <span className="font-medium">{npr(row.revenue)}</span>
                    <span className="text-ink-soft">{npr(row.expenses)}</span>
                    <span className={`font-medium ${row.net >= 0 ? "text-green-600" : "text-warn"}`}>{npr(row.net)}</span>
                    <span className="text-xs text-ink-muted">{(row.revenue > 0 ? (row.net / row.revenue) * 100 : 0).toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-ink-soft">No P&L data for selected range</p>
          )}
        </Panel>

        <Panel title="Key Risks & Watch Items" subtitle="Requiring attention">
          <div className="space-y-3">
            {risks.map((r, i) => <RiskItem key={i} title={r.title} detail={r.detail} />)}
          </div>
        </Panel>

        {health && (
          <Panel title="Health Components" subtitle="Weighted breakdown">
            <div className="space-y-2">
              {health.components.map((c: any) => (
                <div key={c.name} className="flex items-center justify-between text-sm">
                  <span className="text-ink-soft">{c.name}</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${c.score >= 75 ? "text-green-600" : c.score >= 50 ? "text-warn" : "text-warn"}`}>{c.score.toFixed(1)}</span>
                    <span className="text-xs text-ink-muted">({(c.weight * 100).toFixed(0)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </div>
    </>
  );
}