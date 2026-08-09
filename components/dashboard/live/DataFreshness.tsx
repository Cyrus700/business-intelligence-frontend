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

function formatDay(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
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
  const { data } = useDataCoverage();

  if (!data || !data.last_date) return null;

  const behind = data.days_behind ?? 0;
  const selectionStartsAfterData = filters.from > data.last_date;
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
            {formatDay(data.last_date)} — this is missing data, not zero sales.
          </>
        ) : (
          <>
            Data is current through <strong>{formatDay(data.last_date)}</strong> ({behind} day
            {behind === 1 ? "" : "s"} behind today
            {data.last_ingested_at && (
              <>
                ; last upload{" "}
                {new Date(data.last_ingested_at).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </>
            )}
            ).
          </>
        )}
      </span>
    </div>
  );
}
