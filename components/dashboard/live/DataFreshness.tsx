"use client";

import { useQuery } from "@tanstack/react-query";
import Icon from "@/components/ui/Icon";
import { clsx } from "@/lib/cx";
import { apiGet, queryKeys, type DataCoverage } from "@/lib/api";
import { useFilters } from "@/lib/filters";

/** Live coverage of the warehouse — which dates actually hold data. */
export function useDataCoverage() {
  return useQuery<DataCoverage>({
    queryKey: queryKeys.coverage.data(),
    queryFn: () => apiGet<DataCoverage>("/data-coverage"),
    staleTime: 60_000,
  });
}

/** ETL watermark — when data was last refreshed by the pipeline. */
export function useWatermark() {
  return useQuery<{
    last_refresh_at: string | null;
    last_source: string | null;
    last_trigger: string | null;
    affected_range: { start: string; end: string } | null;
    details: Record<string, unknown> | null;
  }>({
    queryKey: ["watermark"],
    queryFn: () => apiGet("/watermark"),
    staleTime: 30_000,
  });
}

function formatDay(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * Explains an empty chart instead of letting it read as a zero.
 *
 * A "Today" filter over a warehouse whose newest row is three days old shows
 * nothing at all — indistinguishable from a day with no sales. This says which
 * of the two it is, and when data was last uploaded.
 */
export default function DataFreshness({ className }: { className?: string }) {
  const { filters } = useFilters();
  const { data: coverage } = useDataCoverage();
  const { data: watermark } = useWatermark();

  if (!coverage || !coverage.last_date) return null;

  const behind = coverage.days_behind ?? 0;
  const selectionStartsAfterData = filters.from > coverage.last_date;
  const stale = behind > 0;

  // Nothing worth saying when the warehouse is current and the selected range
  // overlaps real data.
  if (!stale && !selectionStartsAfterData) return null;

  const tone = selectionStartsAfterData ? "warn" : "muted";

  return (
    <div
      className={clsx(
        "flex items-start gap-2 rounded-xl px-4 py-2.5 text-xs",
        tone === "warn" ? "bg-warn-50 text-warn" : "bg-bg-soft text-ink-soft",
        className,
      )}
    >
      <Icon name={tone === "warn" ? "alert" : "bell"} className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        {selectionStartsAfterData ? (
          <>
            <strong>No data in the selected range.</strong> The warehouse holds data through{" "}
            {formatDay(coverage.last_date)} — this is missing data, not zero sales.
          </>
        ) : (
          <>
            Data is current through <strong>{formatDay(coverage.last_date)}</strong> ({behind} day
            {behind === 1 ? "" : "s"} behind today
            {watermark?.last_refresh_at && (
              <>
                ; last refreshed{" "}
                {formatDateTime(watermark.last_refresh_at)}
                {watermark.last_trigger && <>{" via "}{watermark.last_trigger}</>}
              </>
            )}
            {coverage.last_ingested_at && !watermark?.last_refresh_at && (
              <>
                ; last upload{" "}
                {formatDateTime(coverage.last_ingested_at)}
              </>
            )}
            ).
          </>
        )}
      </span>
    </div>
  );
}