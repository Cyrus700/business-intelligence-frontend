"use client";

import { usePbFilters } from "./PbFilterContext";

export default function SlicerBar() {
  const f = usePbFilters();
  const chips: { dim: "region" | "channel" | "category"; label: string; value: string | null }[] = [
    { dim: "region", label: "Region", value: f.region },
    { dim: "channel", label: "Channel", value: f.channel },
    { dim: "category", label: "Category", value: f.category },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-ink-muted">From</label>
        <input
          type="date"
          value={f.from}
          max={f.to}
          onChange={(e) => f.setDate(e.target.value, f.to)}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm text-ink"
        />
        <label className="text-xs font-medium text-ink-muted">To</label>
        <input
          type="date"
          value={f.to}
          min={f.from}
          onChange={(e) => f.setDate(f.from, e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm text-ink"
        />
      </div>
      <div className="ml-2 flex flex-wrap items-center gap-2">
        {chips.map((c) =>
          c.value ? (
            <button
              key={c.dim}
              onClick={() => f.setDim(c.dim, null)}
              className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
            >
              {c.label}: <span className="font-semibold">{c.value}</span>
              <span className="ml-1 text-primary/70">✕</span>
            </button>
          ) : null,
        )}
        {f.activeCount > 0 && (
          <button onClick={f.clearAll} className="text-xs font-medium text-ink-muted underline">
            Clear all
          </button>
        )}
        <span className="text-xs text-ink-muted">
          {f.activeCount > 0 ? "Cross-filtering all visuals" : "Click any bar/slice to cross-filter"}
        </span>
      </div>
    </div>
  );
}
