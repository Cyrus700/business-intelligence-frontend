"use client";

import { FunnelChart as RechartsFunnelChart, Funnel, LabelList, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { nprCompact } from "@/lib/api";
import { usePbFilters } from "./PbFilterContext";
import Panel, { Loading, Empty } from "./Panel";
import { useFunnel } from "@/lib/advanced";

type Fn = { metric: string; dimension: string; stages: { label: string; value: number }[] };

const PALETTE = ["#4f46e5", "#6366f1", "#818cf8", "#10b981", "#34d399", "#f59e0b", "#fb923c"];

export default function FunnelChart({ metric, dimension }: { metric: string; dimension: string }) {
  const f = usePbFilters();
  const { data, loading } = useFunnel(f, metric, dimension);
  const fn = data as Fn | null;
  if (loading) return <Panel title="Funnel"><Loading /></Panel>;
  if (!fn) return <Panel title="Funnel"><Empty /></Panel>;
  const dimKey = ["region", "channel", "category"].includes(dimension) ? (dimension as any) : null;

  return (
    <Panel title="Funnel" subtitle={`${metric} by ${dimension} (top contributors)`}>
      <ResponsiveContainer width="100%" height={320}>
        <RechartsFunnelChart>
          <Tooltip formatter={(v: any) => nprCompact(Number(v))} />
          <Funnel dataKey="value" data={fn.stages} isAnimationActive>
            <LabelList position="right" fill="#334155" stroke="none" dataKey="label" />
            <LabelList position="center" fill="#fff" stroke="none" dataKey="value" formatter={(v: any) => nprCompact(Number(v))} />
            {fn.stages.map((s, i) => (
              <Cell
                key={s.label}
                fill={PALETTE[i % PALETTE.length]}
                onClick={() => dimKey && f.toggleDim(dimKey, s.label)}
                className={dimKey ? "cursor-pointer" : undefined}
              />
            ))}
          </Funnel>
        </RechartsFunnelChart>
      </ResponsiveContainer>
    </Panel>
  );
}
