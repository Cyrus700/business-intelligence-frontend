// Dashboard-wide date-range + dimension filter utilities.
// Server-safe (no "use client") — pure functions only.

import { createContext, useContext } from "react";

export const BUSINESS_TZ = "Asia/Kathmandu";

export type RangeKey = "1d" | "7d" | "30d" | "90d" | "1y" | "custom";

/** Inclusive day count for each preset — "1d" is today only. */
export const RANGE_DAYS: Record<RangeKey, number> = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1y": 365,
  "custom": 0,
};

export const RANGE_LABELS: Record<RangeKey, string> = {
  "1d": "Today",
  "7d": "7D",
  "30d": "30D",
  "90d": "90D",
  "1y": "1Y",
  "custom": "Custom",
};

export const RANGE_ORDER: RangeKey[] = ["1d", "7d", "30d", "90d", "1y"];

export type Filters = {
  range: RangeKey;
  from: string;
  to: string;
  region?: string;
  channel?: string;
  category?: string;
  // Multi-select support
  regions?: string[];
  channels?: string[];
  categories?: string[];
};

const isoFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function businessToday(): string {
  return isoFormatter.format(new Date());
}

export function businessDaysAgo(days: number): string {
  const [y, m, d] = businessToday().split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d - days));
  return shifted.toISOString().slice(0, 10);
}

export function granularityFor(range: RangeKey): "day" | "week" | "month" | "quarter" | "year" {
  if (range === "1y") return "week";
  if (range === "90d") return "week";
  return "day";
}

export function apiParams(f: Filters): Record<string, string | undefined> {
  return {
    from: f.from,
    to: f.to,
    region: f.region,
    channel: f.channel,
    category: f.category,
    regions: f.regions?.join(","),
    channels: f.channels?.join(","),
    categories: f.categories?.join(","),
  };
}
export type SavedView = {
  id: string;
  name: string;
  filters: Filters;
  createdAt: string;
};

export type FiltersCtx = {
  filters: Filters;
  setRange: (r: RangeKey) => void;
  setCustomRange: (from: string, to: string) => void;
  setDimension: (key: "region" | "channel" | "category", value?: string) => void;
  addMultiDimension: (key: "regions" | "channels" | "categories", value: string) => void;
  removeMultiDimension: (key: "regions" | "channels" | "categories", value: string) => void;
  clearMultiDimension: (key: "regions" | "channels" | "categories") => void;
  applyFilters: (f: Filters) => void;
  resetFilters: () => void;
  available: {
    regions: string[];
    channels: string[];
    categories: string[];
  };
  setAvailable: (key: "regions" | "channels" | "categories", values: string[]) => void;
  savedViews: SavedView[];
  saveView: (name: string) => void;
  loadView: (id: string) => void;
  deleteView: (id: string) => void;
};

const Ctx = createContext<FiltersCtx | null>(null);
export { Ctx };

export function useFilters(): FiltersCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFilters must be used inside DashboardFiltersProvider");
  return ctx;
}
