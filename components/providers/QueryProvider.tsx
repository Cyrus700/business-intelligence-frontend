"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

const STALE_TIME = 30_000; // 30s — data is fresh for 30s before refetch
const GC_TIME = 5 * 60_000; // 5min — keep cached data for 5min after unmount
const RETRY_COUNT = 2; // retry failed queries twice
const REFETCH_INTERVAL = 60_000; // 1min — poll for changes on active queries

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: STALE_TIME,
            gcTime: GC_TIME,
            retry: RETRY_COUNT,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            refetchInterval: REFETCH_INTERVAL,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
