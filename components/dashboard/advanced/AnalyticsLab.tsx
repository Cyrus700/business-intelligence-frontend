"use client";

import { useState } from "react";
import { PbFilterProvider } from "./PbFilterContext";
import SlicerBar from "./SlicerBar";
import DecompositionTree from "./DecompositionTree";
import WaterfallChart from "./WaterfallChart";
import Heatmap from "./Heatmap";
import ScatterBubble from "./ScatterBubble";
import FunnelChart from "./FunnelChart";
import RadarCompare from "./RadarCompare";
import SmallMultiples from "./SmallMultiples";
import KeyInfluencers from "./KeyInfluencers";

const METRICS = ["revenue", "orders", "gross_margin"];

/** Self-contained advanced-analytics canvas with its own cross-filters. */
export default function AnalyticsLab() {
  const [metric, setMetric] = useState("revenue");
  return (
    <PbFilterProvider>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <SlicerBar />
          <div className="ml-auto flex items-center gap-2">
            <label className="text-xs font-medium text-ink-muted">Metric</label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="rounded-md border border-slate-300 px-2 py-1 text-sm text-ink"
            >
              {METRICS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DecompositionTree metric={metric} hierarchy="region,category,product" />
          <WaterfallChart metric={metric} dimension="category" />
          <Heatmap metric={metric} rowDim="region" colDim="category" />
          <ScatterBubble dimension="product" x="revenue" y="margin_pct" size="units" />
          <FunnelChart metric={metric} dimension="category" />
          <RadarCompare dimension="region" metrics="revenue,orders,gross_margin,aov,units" />
          <SmallMultiples metric={metric} dimension="region" granularity="month" />
          <KeyInfluencers target={metric} />
        </div>
      </div>
    </PbFilterProvider>
  );
}
