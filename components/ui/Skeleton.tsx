"use client";

import { clsx } from "@/lib/cx";
import { forwardRef } from "react";

export interface SkeletonProps {
  /** Base variant - text, circular, rectangular, card, table-row, chart */
  variant?: "text" | "circular" | "rectangular" | "card" | "table-row" | "chart" | "kpi";
  /** Width (CSS value) */
  width?: string | number;
  /** Height (CSS value) */
  height?: string | number;
  /** Additional className */
  className?: string;
  /** Number of lines for text variant */
  lines?: number;
  /** Space between lines for text variant */
  gap?: string;
}

/**
 * Base shimmer skeleton component. Keeps layout steady while data loads.
 * Use specific variants for semantic loading placeholders.
 */
export const Skeleton = forwardRef<HTMLSpanElement, SkeletonProps>(
  ({ variant = "text", width, height, className, lines = 1, gap = "0.5rem", ...props }, ref) => {
    const baseStyles = "animate-pulse rounded bg-bg-soft";
    const variantStyles: Record<string, string> = {
      text: "inline-block h-4",
      circular: "rounded-full",
      rectangular: "rounded-lg",
      card: "rounded-xl",
      "table-row": "h-12",
      chart: "rounded-lg",
      kpi: "rounded-xl",
    };

    const content = Array.from({ length: lines }, (_, i) => (
      <span
        key={i}
        ref={i === 0 ? ref : undefined}
className={clsx(
          baseStyles,
          variantStyles[variant],
          variant === "text" && "h-4",
          variant === "circular" && "h-8 w-8",
          variant === "rectangular" && "h-16",
          variant === "card" && "h-32",
          variant === "table-row" && "h-12",
          variant === "chart" && "h-48",
          variant === "kpi" && "h-24",
          variant === "text" && "w-full"
        )}
        style={{
          width: width !== undefined ? `${width}px` : undefined,
          height: height !== undefined ? `${height}px` : undefined,
        }}
        aria-hidden="true"
        {...props}
      />
    ));

    return (
      <span
        className={clsx("flex flex-col gap-2", className)}
        style={{ width: width !== undefined ? `${width}px` : "100%" }}
      >
        {content}
      </span>
    );
  }
);

Skeleton.displayName = "Skeleton";

/** Skeleton for a full KPI card */
export function KpiSkeleton() {
  return (
    <div className="p-5 rounded-xl border border-border bg-white animate-pulse space-y-3">
      <div className="h-4 w-3/4 bg-bg-soft rounded" />
      <div className="h-8 w-1/2 bg-bg-soft rounded" />
      <div className="h-4 w-1/4 bg-bg-soft rounded" />
    </div>
  );
}

/** Skeleton for a chart container */
export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4 animate-pulse">
      <div className="h-6 w-1/4 bg-bg-soft rounded mb-4" />
      <div style={{ height }} className="bg-bg-soft rounded" />
    </div>
  );
}

/** Skeleton for a table with configurable rows/columns */
export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden animate-pulse">
      <div className="bg-bg-soft/50 px-4 py-3 border-b border-border">
        <div className="flex gap-4">
          {Array.from({ length: columns }, (_, i) => (
            <div key={i} className="h-4 w-24 bg-bg-soft rounded" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="px-4 py-3">
            <div className="flex gap-4">
              {Array.from({ length: columns }, (_, j) => (
                <div key={j} className="h-4 w-20 bg-bg-soft rounded flex-1" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton for a list/card grid */
export function ListSkeleton({ items = 3 }: { items?: number }) {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: items }, (_, i) => (
        <div key={i} className="p-4 rounded-xl border border-border bg-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-bg-soft rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-bg-soft rounded" />
              <div className="h-3 w-1/2 bg-bg-soft rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Skeleton;