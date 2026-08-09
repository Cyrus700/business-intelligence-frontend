"use client";

// Dashboard-wide date-range + dimension filters. The demo warehouse's data ends
// 2026-06-30, so ranges are anchored to "today" and simply shrink when empty.

import { createContext, useContext, useMemo, useState } from "react";

export type RangeKey = "7d" | "30d" | "90d" | "12m";

const RANGE_DAYS: Record<RangeKey, number> = { "7d": 7, "30d": 30, "90d": 90, "12m": 365 };

export type Filters = {
  range: RangeKey;
  from: string;
  to: string;
  region?: string;
  channel?: string;
  category?: string;
};

type FiltersCtx = {
  filters: Filters;
  setRange: (r: RangeKey) => void;
  setDimension: (key: "region" | "channel" | "category", value?: string) => void;
};

const Ctx = createContext<FiltersCtx | null>(null);

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function DashboardFiltersProvider({ children }: { children: React.ReactNode }) {
  const [range, setRange] = useState<RangeKey>("30d");
  const [dims, setDims] = useState<Pick<Filters, "region" | "channel" | "category">>({});

  const value = useMemo<FiltersCtx>(() => {
    const days = RANGE_DAYS[range];
    return {
      filters: { range, from: isoDaysAgo(days - 1), to: isoDaysAgo(0), ...dims },
      setRange,
      setDimension: (key, v) => setDims((d) => ({ ...d, [key]: v })),
    };
  }, [range, dims]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFilters(): FiltersCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFilters must be used inside DashboardFiltersProvider");
  return ctx;
}

/** Query params for useApi from the active filters. */
export function apiParams(f: Filters): Record<string, string | undefined> {
  return { from: f.from, to: f.to, region: f.region, channel: f.channel, category: f.category };
}

export function RangePicker() {
  const { filters, setRange } = useFilters();
  return (
    <div className="flex w-full items-center gap-1 rounded-xl border border-border bg-bg-soft p-1 sm:w-auto">
      {(Object.keys(RANGE_DAYS) as RangeKey[]).map((r) => (
        <button
          key={r}
          onClick={() => setRange(r)}
          aria-pressed={filters.range === r}
          className={
            filters.range === r
              ? "flex-1 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-primary shadow-card transition-colors sm:flex-none"
              : "flex-1 rounded-lg px-3 py-1.5 text-sm text-ink-soft transition-colors hover:text-ink sm:flex-none"
          }
        >
          {r}
        </button>
      ))}
    </div>
  );
}
