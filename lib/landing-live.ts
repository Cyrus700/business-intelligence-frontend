// Platform figures for the public landing page, fetched on the server.
//
// This is deliberately *not* a client hook. Every landing section used to call
// GET /landing/live from the browser, which meant the page painted placeholder
// numbers first and swapped them for real ones a second later. Fetching here
// means the real numbers are in the first HTML byte — one request per minute
// for the whole site, not one per section per visitor.
//
// Only platform plumbing is exposed (rows landed, sources connected, ETL
// health, insights written). Business figures stay behind auth.

export type PlatformSnapshot = {
  generated_at: string;
  totals: {
    records_unified: number;
    data_sources: number;
    etl_jobs: number;
    insights: number;
  };
  pipeline: {
    by_status: Record<string, number>;
    success_rate_pct: number;
    last_run_at: string | null;
  };
};

// Server-side calls can take a private/in-cluster address; the browser bundle
// never reads API_URL, so it may differ from NEXT_PUBLIC_API_URL.
const BASE =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

/** Seconds the rendered page may reuse a snapshot — matches the API's own TTL. */
export const LIVE_REVALIDATE = 60;

/** Give up quickly: the landing page must never wait on a slow warehouse. */
const TIMEOUT_MS = 2500;

/**
 * Returns the snapshot, or `null` when the API is unreachable/slow — callers
 * render a number-free variant in that case rather than inventing figures.
 */
export async function getPlatformSnapshot(): Promise<PlatformSnapshot | null> {
  try {
    const res = await fetch(`${BASE}/landing/live`, {
      next: { revalidate: LIVE_REVALIDATE, tags: ["landing-live"] },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as PlatformSnapshot;
    // A warehouse with nothing in it has nothing to prove — treat an empty
    // snapshot as "no data" so the page shows its static variant instead of
    // a wall of zeroes.
    if (!data?.totals?.records_unified) return null;
    return data;
  } catch {
    return null;
  }
}

/** "2026-08-01T09:41:00" → "2h ago" (or "just now" under a minute). */
export function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}
