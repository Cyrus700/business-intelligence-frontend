"use client";

import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { usePbFilters } from "./PbFilterContext";
import Panel, { Loading, Empty } from "./Panel";
import { useScatter } from "@/lib/advanced";

type Sc = {
  dimension: string;
  axes: { x: string; y: string; size: string };
  points: Record<string, any>[];
};

const PALETTE = ["#4f46e5", "#10b981", "#8b5cf6", "#f59e0b", "#06b6d4", "#ef4444"];

export default function ScatterBubble({ dimension, x, y, size }: { dimension: string; x: string; y: string; size: string }) {
  const f = usePbFilters();
  const { data, loading } = useScatter(f, dimension, x, y, size);
  const sc = data as Sc | null;
  if (loading) return <Panel title="Scatter / Bubble"><Loading /></Panel>;
  if (!sc) return <Panel title="Scatter / Bubble"><Empty /></Panel>;

  const dimKey = ["region", "channel", "category"].includes(dimension) ? (dimension as any) : null;
  const sizes = sc.points.map((p) => Number(p[size] ?? 0));
  const sMin = Math.min(...sizes, 0);
  const sMax = Math.max(...sizes, 1);
  const radius = (v: number) => 6 + ((Number(v) - sMin) / (sMax - sMin || 1)) * 26;

  return (
    <Panel title="Scatter / Bubble" subtitle={`${x} vs ${y} (size = ${size}) across ${dimension}`}>
      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart>
          <XAxis type="number" dataKey={x} name={x} tick={{ fontSize: 11 }} />
          <YAxis type="number" dataKey={y} name={y} tick={{ fontSize: 11 }} />
          <ZAxis type="number" dataKey={size} range={[6, 32]} name={size} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={({ payload }) => {
              const p = payload?.[0]?.payload as any;
              if (!p) return null;
              return (
                <div className="rounded-lg border border-slate-200 bg-white p-2 text-xs shadow">
                  <div className="font-semibold text-ink">{p.label}</div>
                  <div className="text-ink-muted">revenue {Math.round(p.revenue).toLocaleString()}</div>
                  <div className="text-ink-muted">margin {p.margin_pct}% · units {Math.round(p.units)}</div>
                </div>
              );
            }}
          />
          <Scatter
            data={sc.points}
            onClick={(p: any) => dimKey && p?.label && f.toggleDim(dimKey, p.label)}
            className={dimKey ? "cursor-pointer" : undefined}
          >
            {sc.points.map((p, i) => (
              <Cell key={p.label} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.75} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </Panel>
  );
}
