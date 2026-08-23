"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { usePbFilters } from "./PbFilterContext";
import Panel, { Loading, Empty } from "./Panel";
import { useRadar } from "@/lib/advanced";

type Rd = { dimension: string; axes: string[]; entities: { entity: string; normalized: Record<string, number> }[] };

const PALETTE = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6"];

export default function RadarCompare({ dimension, metrics }: { dimension: string; metrics: string }) {
  const f = usePbFilters();
  const { data, loading } = useRadar(f, dimension, metrics);
  const rd = data as Rd | null;
  if (loading) return <Panel title="Radar Comparison"><Loading /></Panel>;
  if (!rd) return <Panel title="Radar Comparison"><Empty /></Panel>;
  const dimKey = ["region", "channel", "category"].includes(dimension) ? (dimension as any) : null;

  const chartData = rd.axes.map((axis) => {
    const row: any = { axis };
    rd.entities.forEach((e) => (row[e.entity] = e.normalized[axis]));
    return row;
  });

  return (
    <Panel title="Radar Comparison" subtitle={`Normalized (0–100) ${metrics} across ${dimension}`}>
      <ResponsiveContainer width="100%" height={340}>
        <RadarChart data={chartData} outerRadius="75%">
          <PolarGrid />
          <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
          <Tooltip />
          <Legend />
          {rd.entities.map((e, i) => (
            <Radar
              key={e.entity}
              name={e.entity}
              dataKey={e.entity}
              stroke={PALETTE[i % PALETTE.length]}
              fill={PALETTE[i % PALETTE.length]}
              fillOpacity={0.12}
              onClick={() => dimKey && f.toggleDim(dimKey, e.entity)}
              className={dimKey ? "cursor-pointer" : undefined}
            />
          ))}
        </RadarChart>
      </ResponsiveContainer>
    </Panel>
  );
}
