"use client";

import { nprCompact } from "@/lib/api";
import { usePbFilters } from "./PbFilterContext";
import Panel, { Loading, Empty } from "./Panel";
import { useKeyInfluencers } from "@/lib/advanced";

type Ki = {
  target: string;
  leading_dimension: string | null;
  dimensional_influence: { dimension: string; variation_share: number; top_members: any[] }[];
  numeric_drivers: { correlations: Record<string, number>; ml_importance: { feature: string; importance: number }[] }[];
};

export default function KeyInfluencers({ target }: { target: string }) {
  const f = usePbFilters();
  const { data, loading } = useKeyInfluencers(f, target);
  const ki = data as Ki | null;
  if (loading) return <Panel title="Key Influencers"><Loading /></Panel>;
  if (!ki) return <Panel title="Key Influencers"><Empty /></Panel>;
  const di = ki.dimensional_influence[0];

  return (
    <Panel
      title="Key Influencers"
      subtitle={`What drives ${ki.target}${ki.leading_dimension ? ` — leading: ${ki.leading_dimension}` : ""}`}
    >
      <div className="space-y-4">
        <div>
          <div className="mb-1 text-xs font-medium text-ink-muted">Dimensional influence (variation explained)</div>
          {ki.dimensional_influence.map((d) => (
            <div key={d.dimension} className="mb-1">
              <div className="flex justify-between text-xs">
                <span className="text-ink-soft">{d.dimension}</span>
                <span className="font-mono text-ink">{(d.variation_share * 100).toFixed(0)}%</span>
              </div>
              <div className="h-2 rounded bg-slate-100">
                <div className="h-2 rounded bg-primary" style={{ width: `${d.variation_share * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
        {di && (
          <div>
            <div className="mb-1 text-xs font-medium text-ink-muted">Top {di.dimension} influencers</div>
            <ul className="space-y-1">
              {di.top_members.map((m) => (
                <li key={m.member} className="flex items-center justify-between text-sm">
                  <span className="text-ink-soft">{m.member}</span>
                  <span className="font-mono text-xs text-ink">{nprCompact(m.value)} · {m.lift_vs_average >= 0 ? "+" : ""}{m.lift_vs_average}% lift</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {ki.numeric_drivers[0] && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-1 text-xs font-medium text-ink-muted">Correlation with {ki.target}</div>
              {Object.entries(ki.numeric_drivers[0].correlations).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs">
                  <span className="text-ink-soft">{k}</span>
                  <span className={`font-mono ${v >= 0 ? "text-emerald-600" : "text-red-600"}`}>{v}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="mb-1 text-xs font-medium text-ink-muted">ML feature importance</div>
              {ki.numeric_drivers[0].ml_importance.map((m) => (
                <div key={m.feature} className="flex justify-between text-xs">
                  <span className="text-ink-soft">{m.feature}</span>
                  <span className="font-mono text-ink">{m.importance}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
