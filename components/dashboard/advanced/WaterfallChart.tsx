"use client";

import { nprCompact } from "@/lib/api";
import { usePbFilters } from "./PbFilterContext";
import Panel, { Loading, Empty } from "./Panel";
import { useWaterfall } from "@/lib/advanced";

type Wf = {
  metric: string;
  dimension: string;
  start: number;
  end: number;
  total_change: number;
  change_pct: number | null;
  steps: { label: string; delta: number }[];
};

export default function WaterfallChart({ metric, dimension }: { metric: string; dimension: string }) {
  const f = usePbFilters();
  const { data, loading } = useWaterfall(f, metric, dimension);
  const wf = data as Wf | null;
  if (loading) return <Panel title="Variance Bridge (Waterfall)"><Loading /></Panel>;
  if (!wf) return <Panel title="Variance Bridge (Waterfall)"><Empty /></Panel>;

  const bars = [
    { label: "Start", value: wf.start, base: 0, type: "total" as const },
    ...wf.steps.map((s) => ({ label: s.label, delta: s.delta, type: "delta" as const })),
    { label: "End", value: wf.end, base: 0, type: "total" as const },
  ];
  // Compute running heights for delta bars.
  let cum = wf.start;
  const computed = bars.map((b) => {
    if (b.type === "total") {
      const out = { ...b, top: b.value, bottom: 0 };
      cum = b.value;
      return out;
    }
    const delta = (b as any).delta as number;
    const top = Math.max(cum, cum + delta);
    const bottom = Math.min(cum, cum + delta);
    cum += delta;
    return { ...b, top, bottom, delta };
  });

  const W = 720;
  const H = 320;
  const pad = 30;
  const maxV = Math.max(...computed.map((c) => c.top), 1);
  const minV = Math.min(0, ...computed.map((c) => (c as any).bottom ?? 0));
  const scale = (v: number) => H - pad - ((v - minV) / (maxV - minV)) * (H - pad * 2);
  const bw = (W - pad * 2) / computed.length - 10;

  return (
    <Panel
      title="Variance Bridge (Waterfall)"
      subtitle={`${metric} by ${dimension}: ${wf.start >= 0 ? nprCompact(wf.start) : ""} → ${nprCompact(wf.end)} (${wf.change_pct ?? 0}%)`}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {computed.map((c, i) => {
          const x = pad + i * ((W - pad * 2) / computed.length) + 5;
          if (c.type === "total") {
            const y = scale(c.top);
            return (
              <g key={c.label}>
                <rect x={x} y={y} width={bw} height={H - pad - y} fill="#4f46e5" rx={3} />
                <text x={x + bw / 2} y={y - 6} textAnchor="middle" className="fill-ink text-[10px]">{nprCompact(c.top)}</text>
                <text x={x + bw / 2} y={H - 8} textAnchor="middle" className="fill-ink-muted text-[10px]">{c.label}</text>
              </g>
            );
          }
          const delta = (c as any).delta as number;
          const yTop = scale(c.top);
          const yBot = scale(c.bottom);
          const yPrev = scale(i === 0 ? wf.start : computed[i - 1].top);
          return (
            <g key={c.label}>
              <line x1={x - 5} y1={yPrev} x2={x + bw + 5} y2={yPrev} stroke="#cbd5e1" strokeDasharray="2 2" />
              <rect x={x} y={yTop} width={bw} height={Math.max(1, yBot - yTop)} fill={delta >= 0 ? "#10b981" : "#ef4444"} rx={3} />
              <text x={x + bw / 2} y={yTop - 5} textAnchor="middle" className={`fill-ink text-[10px] ${delta >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {delta >= 0 ? "+" : ""}{nprCompact(delta)}
              </text>
              <text x={x + bw / 2} y={H - 8} textAnchor="middle" className="fill-ink-muted text-[10px]">{c.label}</text>
            </g>
          );
        })}
      </svg>
    </Panel>
  );
}
