"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ApiError } from "@/lib/api";

// Warehouse data is refreshed by the ETL pipeline, not per-second — a 5min
// freshness window matches how fast the numbers can actually change and keeps
// a dashboard-full of panels from re-requesting on every mount/remount.
const STALE_TIME = 5 * 60_000;
const GC_TIME = 30 * 60_000; // survive navigation between dashboard pages
const RETRY_COUNT = 2;

/**
 * NOTE: there is deliberately no global `refetchInterval`.
 *
 * A blanket interval multiplies by the number of mounted queries — the
 * overview alone mounts ~15, so a 60s interval meant 15 requests/min forever,
 * per open tab. Panels that genuinely need live data opt in individually
 * (see `useApi`'s `refetchInterval` option).
 */
export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: STALE_TIME,
            gcTime: GC_TIME,
            // Only 5xx / network faults are worth retrying: a 401/403/404 will
            // fail identically on retry and just triples the load.
            retry: (failureCount, error) => {
              if (error instanceof ApiError && error.status < 500) return false;
              return failureCount < RETRY_COUNT;
            },
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 15_000),
            // Tab-focus refetching fires every mounted query at once. Reconnect
            // still refetches, so data recovers after a dropped connection.
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            // Mount refetches still happen, but only for genuinely stale data,
            // so navigating between dashboard pages re-uses the warm cache.
            refetchOnMount: true,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
