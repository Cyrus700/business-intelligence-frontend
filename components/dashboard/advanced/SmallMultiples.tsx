"use client";

import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { usePbFilters } from "./PbFilterContext";
import Panel, { Loading, Empty } from "./Panel";
import { useSmallMultiples } from "@/lib/advanced";

type Sm = {
  metric: string;
  dimension: string;
  granularity: string;
  periods: string[];
  series: { member: string; points: { period: string; value: number }[] }[];
};

export default function SmallMultiples({
  metric,
  dimension,
  granularity,
}: {
  metric: string;
  dimension: string;
  granularity: string;
}) {
  const f = usePbFilters();
  const { data, loading } = useSmallMultiples(f, metric, dimension, granularity);
  const sm = data as Sm | null;
  if (loading) return <Panel title="Small Multiples"><Loading /></Panel>;
  if (!sm) return <Panel title="Small Multiples"><Empty /></Panel>;
  const dimKey = (["region", "channel", "category"].includes(dimension) ? dimension : null) as
    | "region"
    | "channel"
    | "category"
    | null;
  const shown = sm.series.slice(0, 9);

  return (
    <Panel title="Small Multiples" subtitle={`${metric} trend by ${dimension} (${granularity})`}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {shown.map((s, i) => (
          <button
            key={s.member}
            onClick={() => dimKey && f.toggleDim(dimKey, s.member)}
            className={`rounded-lg border p-2 text-left ${dimKey ? "hover:border-primary" : ""} ${dimKey && (f as any)[dimKey] === s.member ? "border-primary" : "border-slate-200"}`}
          >
            <div className="mb-1 truncate text-xs font-medium text-ink">{s.member}</div>
            <ResponsiveContainer width="100%" height={90}>
              <LineChart data={s.points}>
                <XAxis dataKey="period" hide />
                <YAxis hide domain={["auto", "auto"]} />
                <Tooltip
                  labelFormatter={(l) => String(l)}
                  formatter={(v: any) => Math.round(Number(v)).toLocaleString()}
                  contentStyle={{ fontSize: 11 }}
                />
                <Line type="monotone" dataKey="value" stroke={`hsl(${(i * 47) % 360} 70% 55%)`} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </button>
        ))}
      </div>
    </Panel>
  );
}
