"use client";

import { useState, useRef, useEffect, useId } from "react";
import { clsx } from "@/lib/cx";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

import {
  BUSINESS_TZ,
  RANGE_DAYS,
  RANGE_LABELS,
  RANGE_ORDER,
  type Filters,
  businessToday,
  useFilters,
} from "./utils";

/** Enhanced RangePicker with custom date range support */
export function RangePicker({ className }: { className?: string }) {
  const { filters, setRange } = useFilters();
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);
  const customRangeFromId = useId();
  const customRangeToId = useId();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowCustom(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setShowCustom(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  const handleCustomApply = () => {
    if (customFrom && customTo) {
      // setCustomRange(customFrom, customTo); // Not implemented in context yet
      setShowCustom(false);
    }
  };

  return (
    <div className={clsx("relative", className)}>
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
                ? `Today (${filters.to}, ${BUSINESS_TZ})`
                : `Last ${RANGE_DAYS[r]} days`
            }
            className={clsx(
              "flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              filters.range === r
                ? "bg-white text-primary shadow-card sm:flex-none"
                : "text-ink-soft hover:text-ink sm:flex-none"
            )}
          >
            {RANGE_LABELS[r]}
          </button>
        ))}
        <button
          onClick={() => setShowCustom(!showCustom)}
          aria-pressed={showCustom || filters.range === "custom"}
          aria-expanded={showCustom}
          aria-haspopup="true"
          className={clsx(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none",
            (showCustom || filters.range === "custom")
              ? "bg-white text-primary shadow-card"
              : "text-ink-soft hover:text-ink"
          )}
        >
          <Icon name="calendar" className="h-4 w-4" />
          <span>Custom</span>
          <Icon name="arrow" className={clsx("h-3.5 w-3.5", showCustom && "rotate-180")} />
        </button>
      </div>

      {showCustom && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-full mt-2 z-20 w-64 rounded-xl border border-border bg-white p-3 shadow-lg animate-in fade-in-20"
          role="dialog"
          aria-label="Custom date range"
        >
          <div className="space-y-3">
            <div>
              <label htmlFor={customRangeFromId} className="block text-xs font-medium text-ink-muted mb-1">From</label>
              <input
                id={customRangeFromId}
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                max={customTo || businessToday()}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor={customRangeToId} className="block text-xs font-medium text-ink-muted mb-1">To</label>
              <input
                id={customRangeToId}
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                max={businessToday()}
                min={customFrom || undefined}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setShowCustom(false)} className="flex-1">
                Cancel
              </Button>
              <Button size="sm" onClick={handleCustomApply} className="flex-1">
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Multi-select dropdown for dimensions */
export function MultiSelectFilter({
  label,
  values,
  available,
  onAdd,
  onRemove,
  onClear,
  className,
}: {
  label: string;
  values: string[];
  available: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  onClear: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  const remaining = available.filter((v) => !values.includes(v));

  return (
    <div className={clsx("relative", className)}>
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={clsx(
          "flex items-center justify-between gap-2 w-full px-3 py-2 text-sm border border-border rounded-xl bg-white hover:bg-bg-soft transition-colors",
          open && "border-primary shadow-lg"
        )}
      >
        <span className="text-ink-muted">{label}</span>
        {values.length > 0 && (
          <div className="flex flex-wrap gap-1 ml-auto">
            {values.slice(0, 3).map((v) => (
              <Badge key={v} variant="secondary" className="gap-1" onClick={() => onRemove(v)}>
                {v}
                <Icon name="close" className="ml-1 h-3 w-3 text-destructive/70" />
              </Badge>
            ))}
            {values.length > 3 && (
              <Badge variant="secondary" className="ml-1">+{values.length - 3} more</Badge>
            )}
          </div>
        )}
        <Icon name={open ? "arrow" : "arrow"} className={clsx("h-4 w-4 text-ink-muted", open && "rotate-180")} />
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute left-0 top-full mt-1 z-20 w-full min-w-[240px] max-h-64 rounded-xl border border-border bg-white shadow-lg overflow-auto animate-in fade-in-20"
          role="group"
          aria-label={`${label} options`}
        >
          <div className="p-2 border-b border-border flex items-center justify-between">
            <span className="text-sm font-medium text-ink-muted">{label}</span>
            {values.length > 0 && (
              <Button variant="ghost" size="sm" onClick={onClear}>
                <Icon name="close" className="h-3 w-3 mr-1" />
                Clear all
              </Button>
            )}
          </div>
          <div className="max-h-48 overflow-auto">
            {remaining.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-ink-muted">No more options</p>
            ) : (
              remaining.map((v) => {
                return (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={values.includes(v)}
                    onClick={() => {
                      onAdd(v);
                      setOpen(false);
                    }}
                    className="w-full px-3 py-2 text-sm text-left hover:bg-bg-soft transition-colors"
                  >
                    {v}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Single-select filter (kept for backward compat) */
export function SingleSelectFilter({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value?: string;
  options: string[];
  onChange: (value?: string) => void;
  className?: string;
}) {
  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value || undefined)}
      className={clsx(
        "px-3 py-2 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary",
        className
      )}
      aria-label={label}
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

/** Filter chips bar - shows active filters with clear actions */
export function FilterChipsBar({
  filters,
  onRemoveRegion,
  onRemoveChannel,
  onRemoveCategory,
  onClearAll,
}: {
  filters: Filters;
  onRemoveRegion: (v: string) => void;
  onRemoveChannel: (v: string) => void;
  onRemoveCategory: (v: string) => void;
  onClearAll: () => void;
}) {
  const chips: Array<{ label: string; value: string; type: string; onRemove: () => void }> = [];

  if (filters.region) chips.push({ label: filters.region, value: filters.region, type: "Region", onRemove: () => onRemoveRegion(filters.region!) });
  if (filters.channel) chips.push({ label: filters.channel, value: filters.channel, type: "Channel", onRemove: () => onRemoveChannel(filters.channel!) });
  if (filters.category) chips.push({ label: filters.category, value: filters.category, type: "Category", onRemove: () => onRemoveCategory(filters.category!) });

  filters.regions?.forEach((v) => chips.push({ label: v, value: v, type: "Region", onRemove: () => onRemoveRegion(v) }));
  filters.channels?.forEach((v) => chips.push({ label: v, value: v, type: "Channel", onRemove: () => onRemoveChannel(v) }));
  filters.categories?.forEach((v) => chips.push({ label: v, value: v, type: "Category", onRemove: () => onRemoveCategory(v) }));

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-4 p-3 rounded-xl border border-border bg-bg-soft animate-in slide-in-from-top-2">
      <span className="text-xs font-medium text-ink-muted mr-2">Active filters:</span>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <Badge
            key={`${chip.type}-${chip.value}`}
            variant="secondary"
            className="gap-1"
            onClick={chip.onRemove}
          >
            <span className="font-medium">{chip.type}:</span>
            {chip.label}
            <Icon name="close" className="ml-1 h-3 w-3 text-destructive/70" />
          </Badge>
        ))}
        {chips.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearAll} className="ml-auto">
            <Icon name="close" className="h-3 w-3 mr-1" />
            Clear all
          </Button>
        )}
      </div>
    </div>
  );
}

/** Export button with format options */
export function ExportButton({
  onExport,
  loading = false,
  formats = ["csv", "xlsx", "json"],
  className,
}: {
  onExport: (format: string) => void;
  loading?: boolean;
  formats?: string[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  return (
    <div className={clsx("relative", className)}>
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Export data"
        disabled={loading}
        className={clsx(
          "inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-white text-sm font-medium text-ink hover:bg-bg-soft disabled:opacity-50 transition-colors",
          open && "border-primary shadow-lg"
        )}
      >
        <Icon name="download" className="h-4 w-4" />
        <span>Export</span>
        <Icon name={open ? "arrow" : "arrow"} className={clsx("h-4 w-4 text-ink-muted", open && "rotate-180")} />
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-full mt-1 z-20 min-w-[160px] rounded-xl border border-border bg-white shadow-lg animate-in fade-in-20"
          role="menu"
        >
          <div className="p-1">
            {formats.map((format) => (
              <button
                key={format}
                role="menuitem"
                onClick={() => { onExport(format); setOpen(false); }}
                className="w-full px-3 py-2 text-sm text-left hover:bg-bg-soft rounded-lg transition-colors flex items-center gap-2"
              >
                <Icon name={format === "csv" ? "download" : format === "xlsx" ? "table" : "copy"} className="h-4 w-4" />
                <span className="capitalize">{format}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Power BI Bookmarks — Saved Views (localStorage) */
export function SavedViewsBar({ className }: { className?: string }) {
  const { savedViews, saveView, loadView, deleteView, filters, resetFilters } = useFilters();
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);

  const handleSave = () => {
    if (!name.trim()) {
      const auto = `${filters.range.toUpperCase()} · ${filters.from}→${filters.to}${
        (filters.regions?.length ?? 0) + (filters.channels?.length ?? 0) + (filters.categories?.length ?? 0) > 0
          ? ` · ${[filters.regions?.join(","), filters.channels?.join(","), filters.categories?.join(",")].filter(Boolean).join(" | ")}`
          : ""
      }`;
      saveView(auto);
    } else {
      saveView(name);
      setName("");
    }
    setOpen(false);
  };

  return (
    <div className={clsx("flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-2", className)}>
      <div className="flex items-center gap-2 text-xs font-medium text-ink-soft">
        <Icon name="bookmark" className="h-4 w-4" />
        <span>Bookmarks</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {savedViews.length === 0 && (
          <span className="text-xs text-ink-muted px-2 py-1">No saved views — save current filters to reuse.</span>
        )}
        {savedViews.map((v) => (
          <div key={v.id} className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 pl-3 pr-1 py-1 text-xs">
            <button
              onClick={() => loadView(v.id)}
              className="font-medium text-violet-700 hover:text-violet-900"
              title={`${v.filters.from} → ${v.filters.to} · ${v.filters.range}`}
            >
              {v.name}
            </button>
            <button
              onClick={() => deleteView(v.id)}
              aria-label={`Delete ${v.name}`}
              className="rounded-full p-0.5 hover:bg-violet-200"
            >
              <Icon name="close" className="h-3 w-3 text-violet-600" />
            </button>
          </div>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-2">
        {open ? (
          <>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") setOpen(false);
              }}
              placeholder="View name (optional)"
              className="w-40 rounded-lg border border-border px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
              <Icon name="bookmark" className="h-3.5 w-3.5 mr-1" />
              Save current
            </Button>
            <Button size="sm" variant="ghost" onClick={resetFilters}>
              <Icon name="refresh" className="h-3.5 w-3.5 mr-1" />
              Reset
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// Re-export utilities
export { businessToday, businessDaysAgo, granularityFor, apiParams, type Filters, type RangeKey } from "./utils";