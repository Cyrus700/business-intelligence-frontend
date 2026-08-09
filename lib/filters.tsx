"use client";

// Dashboard-wide date-range + dimension filters.
//
// Dates are computed in the *business* timezone (Asia/Kathmandu), matching
// app/core/clock.py on the backend. Using the browser's clock — or worse,
// toISOString(), which converts to UTC — makes "today" flip to the previous
// day for anyone west of the business zone, so an evening sale disappears
// from the Today filter while still counting on the server.

import { createContext, useContext, useMemo, useState } from "react";

export const BUSINESS_TZ = "Asia/Kathmandu";

export type RangeKey = "1d" | "7d" | "30d" | "90d" | "1y";

/** Inclusive day count for each preset — "1d" is today only. */
const RANGE_DAYS: Record<RangeKey, number> = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1y": 365,
};

export const RANGE_LABELS: Record<RangeKey, string> = {
  "1d": "Today",
  "7d": "7D",
  "30d": "30D",
  "90d": "90D",
  "1y": "1Y",
};

export const RANGE_ORDER: RangeKey[] = ["1d", "7d", "30d", "90d", "1y"];

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

// en-CA formats as YYYY-MM-DD, which is exactly the wire format the API wants.
const isoFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's date in the business timezone, as YYYY-MM-DD. */
export function businessToday(): string {
  return isoFormatter.format(new Date());
}

/** `days` before the business-timezone today, as YYYY-MM-DD. */
export function businessDaysAgo(days: number): string {
  // Shift by whole days from the *business* day, not from the UTC instant, so
  // DST-free +05:45 arithmetic can never land on the wrong calendar date.
  const [y, m, d] = businessToday().split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d - days));
  return shifted.toISOString().slice(0, 10);
}

/** Chart bucket that keeps a range readable: days for short spans, weeks for a year. */
export function granularityFor(range: RangeKey): "day" | "week" | "month" {
  if (range === "1y") return "week";
  return "day";
}

export function DashboardFiltersProvider({ children }: { children: React.ReactNode }) {
  const [range, setRange] = useState<RangeKey>("30d");
  const [dims, setDims] = useState<Pick<Filters, "region" | "channel" | "category">>({});

  const value = useMemo<FiltersCtx>(() => {
    const days = RANGE_DAYS[range];
    return {
      filters: {
        range,
        from: businessDaysAgo(days - 1),
        to: businessToday(),
        ...dims,
      },
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
    <div
      role="group"
      aria-label="Date range"
      className="flex w-full items-center gap-1 rounded-xl border border-border bg-bg-soft p-1 sm:w-auto"
    >
      {RANGE_ORDER.map((r) => (
        <button
          key={r}
          onClick={() => setRange(r)}
          aria-pressed={filters.range === r}
          title={
            r === "1d"
              ? `Today (${filters.range === r ? filters.to : businessToday()}, ${BUSINESS_TZ})`
              : `Last ${RANGE_DAYS[r]} days`
          }
          className={
            filters.range === r
              ? "flex-1 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-primary shadow-card transition-colors sm:flex-none"
              : "flex-1 rounded-lg px-3 py-1.5 text-sm text-ink-soft transition-colors hover:text-ink sm:flex-none"
          }
        >
          {RANGE_LABELS[r]}
        </button>
      ))}
    </div>
  );
}
