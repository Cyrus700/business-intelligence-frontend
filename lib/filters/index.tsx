"use client";

import { useEffect, useMemo, useState } from "react";

import {
  RANGE_DAYS,
  Ctx,
  type RangeKey,
  type Filters,
  type FiltersCtx,
  type SavedView,
  businessToday,
  businessDaysAgo,
} from "./utils";

export function DashboardFiltersProvider({ children }: { children: React.ReactNode }) {
  const [range, setRange] = useState<RangeKey>("30d");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [dims, setDims] = useState<Pick<Filters, "region" | "channel" | "category">>({});
  const [multiDims, setMultiDims] = useState<Pick<Filters, "regions" | "channels" | "categories">>({
    regions: [],
    channels: [],
    categories: [],
  });
  const [available, setAvailable] = useState<FiltersCtx["available"]>({
    regions: [],
    channels: [],
    categories: [],
  });
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);

  // Load saved views from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("sairash.savedViews");
      if (raw) setSavedViews(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("sairash.savedViews", JSON.stringify(savedViews));
    } catch {
      // quota or privacy mode
    }
  }, [savedViews]);

  const value = useMemo<FiltersCtx>(() => {
    let from: string, to: string;
    if (range === "custom") {
      from = customFrom || businessDaysAgo(29);
      to = customTo || businessToday();
    } else {
      const days = RANGE_DAYS[range];
      from = businessDaysAgo(days - 1);
      to = businessToday();
    }

    const currentFilters: Filters = {
      range,
      from,
      to,
      ...dims,
      ...multiDims,
    };

    return {
      filters: currentFilters,
      setRange,
      setCustomRange: (f: string, t: string) => {
        setRange("custom");
        setCustomFrom(f);
        setCustomTo(t);
      },
      setDimension: (key, v) => setDims((d) => ({ ...d, [key]: v })),
      addMultiDimension: (key, v) =>
        setMultiDims((d) => ({
          ...d,
          [key]: [...(d[key] || []), v],
        })),
      removeMultiDimension: (key, v) =>
        setMultiDims((d) => ({
          ...d,
          [key]: (d[key] || []).filter((x) => x !== v),
        })),
      clearMultiDimension: (key) =>
        setMultiDims((d) => ({ ...d, [key]: [] })),
      applyFilters: (f: Filters) => {
        setRange(f.range);
        if (f.range === "custom") {
          setCustomFrom(f.from);
          setCustomTo(f.to);
        }
        setDims({ region: f.region, channel: f.channel, category: f.category });
        setMultiDims({
          regions: f.regions ?? [],
          channels: f.channels ?? [],
          categories: f.categories ?? [],
        });
      },
      resetFilters: () => {
        setRange("30d");
        setCustomFrom("");
        setCustomTo("");
        setDims({});
        setMultiDims({ regions: [], channels: [], categories: [] });
      },
      available,
      setAvailable: (key, values) =>
        setAvailable((a) => ({ ...a, [key]: values })),
      savedViews,
      saveView: (name: string) => {
        const view: SavedView = {
          id: Math.random().toString(36).slice(2, 9),
          name: name.trim() || `View ${savedViews.length + 1}`,
          filters: currentFilters,
          createdAt: new Date().toISOString(),
        };
        setSavedViews((prev) => [...prev, view]);
      },
      loadView: (id: string) => {
        const view = savedViews.find((v) => v.id === id);
        if (!view) return;
        setRange(view.filters.range);
        if (view.filters.range === "custom") {
          setCustomFrom(view.filters.from);
          setCustomTo(view.filters.to);
        }
        setDims({
          region: view.filters.region,
          channel: view.filters.channel,
          category: view.filters.category,
        });
        setMultiDims({
          regions: view.filters.regions ?? [],
          channels: view.filters.channels ?? [],
          categories: view.filters.categories ?? [],
        });
      },
      deleteView: (id: string) =>
        setSavedViews((prev) => prev.filter((v) => v.id !== id)),
    };
  }, [range, customFrom, customTo, dims, multiDims, available, savedViews]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export { businessToday, businessDaysAgo, granularityFor, apiParams } from "./utils";

export { RangePicker, MultiSelectFilter, SingleSelectFilter, FilterChipsBar, ExportButton, SavedViewsBar } from "./components";

export type { Filters, RangeKey, FiltersCtx } from "./utils";
export { useFilters } from "./utils";