"use client";

import { clsx } from "@/lib/cx";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import { Skeleton, KpiSkeleton, ChartSkeleton, TableSkeleton, ListSkeleton } from "@/components/ui/Skeleton";

export interface LoadingStateProps {
  /** Custom message */
  message?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show as inline or block */
  inline?: boolean;
  /** Custom className */
  className?: string;
}

/** Generic loading spinner with message */
export function LoadingState({
  message = "Loading…",
  size = "md",
  inline = false,
  className,
}: LoadingStateProps) {
  const sizes = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div
      className={clsx(
        "flex items-center justify-center gap-2",
        inline ? "inline-flex" : "flex",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className={clsx(
          "animate-spin rounded-full border-2 border-primary/30 border-t-primary",
          sizes[size]
        )}
        aria-hidden="true"
      />
      <span className="text-sm text-ink-muted">{message}</span>
    </div>
  );
}

/** Full-page loading overlay */
export function PageLoading({ message = "Loading dashboard…" }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm">
      <div className="text-center space-y-4 p-8 rounded-2xl border border-border bg-white shadow-xl">
        <div className="mx-auto animate-spin rounded-full border-4 border-primary/30 border-t-primary h-10 w-10" />
        <p className="text-lg font-medium text-ink">{message}</p>
        <p className="text-sm text-ink-muted">Please wait while we fetch the latest data</p>
      </div>
    </div>
  );
}

/** Section/card loading with skeleton */
export function SectionLoading({ title = "Section", skeleton }: { title?: string; skeleton: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton variant="text" width={120} />
          <LoadingState size="sm" message="Loading…" inline />
        </div>
      </div>
      {skeleton}
    </div>
  );
}

/** KPI grid loading */
export function KpiGridLoading({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => <KpiSkeleton key={i} />)}
    </div>
  );
}

/** Chart loading */
export function ChartLoading({ title = "Chart", height = 300 }: { title?: string; height?: number }) {
  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <Skeleton variant="text" width={120} />
        <LoadingState size="sm" message="Loading…" inline />
      </div>
      <ChartSkeleton height={height} />
    </div>
  );
}

/** Table loading */
export function TableLoading({ title = "Data", rows = 5, columns = 5 }: { title?: string; rows?: number; columns?: number }) {
  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <Skeleton variant="text" width={120} />
        <LoadingState size="sm" message="Loading…" inline />
      </div>
      <TableSkeleton rows={rows} columns={columns} />
    </div>
  );
}

/** List/card grid loading */
export function ListLoading({ title = "Items", count = 3 }: { title?: string; count?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton variant="text" width={100} />
        <LoadingState size="sm" message="Loading…" inline />
      </div>
      <ListSkeleton items={count} />
    </div>
  );
}