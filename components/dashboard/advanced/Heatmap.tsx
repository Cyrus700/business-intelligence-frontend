"use client";

import { nprCompact } from "@/lib/api";
import { usePbFilters } from "./PbFilterContext";
import Panel, { Loading, Empty } from "./Panel";
import { useHeatmap } from "@/lib/advanced";

type Hm = {
  metric: string;
  row_dim: string;
  col_dim: string;
  rows: string[];
  cols: string[];
  matrix: number[][];
  min: number;
  max: number;
};

function color(v: number, min: number, max: number): string {
  if (max <= min) return "#eef2ff";
  const t = (v - min) / (max - min);
  // light indigo → deep indigo
  const r = Math.round(238 - t * (238 - 67));
  const g = Math.round(242 - t * (242 - 56));
  const b = Math.round(255 - t * (255 - 202));
  return `rgb(${r},${g},${b})`;
}

export default function Heatmap({
  metric,
  rowDim,
  colDim,
}: {
  metric: string;
  rowDim: string;
  colDim: string;
}) {
  const f = usePbFilters();
  const { data, loading } = useHeatmap(f, metric, rowDim, colDim);
  const hm = data as Hm | null;
  if (loading) return <Panel title="Heatmap Matrix"><Loading /></Panel>;
  if (!hm) return <Panel title="Heatmap Matrix"><Empty /></Panel>;
  const dimOf = (d: string) => (["region", "channel", "category"].includes(d) ? (d as "region" | "channel" | "category") : null);

  return (
    <Panel title="Heatmap Matrix" subtitle={`${metric} — ${hm.row_dim} × ${hm.col_dim}`}>
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-1 text-xs">
          <thead>
            <tr>
              <th className="px-1 text-left text-ink-muted">{hm.row_dim}</th>
              {hm.cols.map((c) => (
                <th key={c} className="px-1 text-center text-ink-muted">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hm.rows.map((r, ri) => (
              <tr key={r}>
                <td className="whitespace-nowrap pr-2 text-ink-soft">{r}</td>
                {hm.cols.map((c, ci) => {
                  const v = hm.matrix[ri][ci];
                  const rd = dimOf(hm.row_dim);
                  return (
                    <td key={c}>
                      <button
                        onClick={() => rd && f.toggleDim(rd, r)}
                        title={`${r} · ${c}: ${nprCompact(v)}`}
                        className="h-9 w-16 rounded text-[10px] font-medium text-slate-800"
                        style={{ background: color(v, hm.min, hm.max) }}
                      >
                        {nprCompact(v)}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
