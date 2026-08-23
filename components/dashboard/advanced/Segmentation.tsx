"use client";

import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { nprCompact } from "@/lib/api";
import { usePbFilters } from "./PbFilterContext";
import Panel, { Loading, Empty } from "./Panel";
import { useSegmentation } from "@/lib/advanced";

type Seg = {
  dimension: string;
  n_clusters: number;
  pca_variance_explained: number[];
  entities: { label: string; cluster: number; x: number; y: number; revenue: number; margin_pct: number; units: number }[];
  clusters: { cluster: number; size: number; avg_revenue: number; avg_margin_pct: number; members_sample: string[] }[];
};

const PALETTE = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6"];

export default function Segmentation({ dimension, nClusters }: { dimension: string; nClusters: number }) {
  const f = usePbFilters();
  const { data, loading } = useSegmentation(f, dimension, nClusters);
  const seg = data as Seg | null;
  if (loading) return <Panel title="Segmentation (K-Means)"><Loading /></Panel>;
  if (!seg || !seg.entities.length) return <Panel title="Segmentation (K-Means)"><Empty /></Panel>;

  return (
    <Panel
      title="Segmentation (K-Means + PCA)"
      subtitle={`${seg.dimension} · ${seg.n_clusters} clusters · PCA var explained ${(seg.pca_variance_explained.reduce((a, b) => a + b, 0) * 100).toFixed(0)}%`}
    >
      <div className="grid gap-3 lg:grid-cols-2">
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <XAxis type="number" name="PC1" tick={{ fontSize: 11 }} />
            <YAxis type="number" name="PC2" tick={{ fontSize: 11 }} />
            <ZAxis range={[40, 40]} />
            <Tooltip
              content={({ payload }) => {
                const p = payload?.[0]?.payload as any;
                if (!p) return null;
                return (
                  <div className="rounded-lg border border-slate-200 bg-white p-2 text-xs shadow">
                    <div className="font-semibold text-ink">{p.label}</div>
                    <div className="text-ink-muted">cluster {p.cluster} · rev {nprCompact(p.revenue)} · margin {p.margin_pct}%</div>
                  </div>
                );
              }}
            />
            <Scatter data={seg.entities}>
              {seg.entities.map((e) => (
                <Cell key={e.label} fill={PALETTE[e.cluster % PALETTE.length]} fillOpacity={0.8} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        <ul className="space-y-2">
          {seg.clusters.map((c) => (
            <li key={c.cluster} className="rounded-lg border border-slate-200 p-2">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: PALETTE[c.cluster % PALETTE.length] }} />
                <span className="text-sm font-medium text-ink">Cluster {c.cluster}</span>
                <span className="ml-auto text-xs text-ink-muted">{c.size} items</span>
              </div>
              <div className="mt-1 text-xs text-ink-muted">
                avg rev {nprCompact(c.avg_revenue)} · margin {c.avg_margin_pct}% · e.g. {c.members_sample.slice(0, 2).join(", ")}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}
