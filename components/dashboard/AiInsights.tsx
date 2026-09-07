"use client";

import { clsx } from "@/lib/cx";
import Icon from "@/components/ui/Icon";
import { useApi } from "@/lib/api";
import type { AIInsight } from "@/lib/api";

const TONE: Record<string, string> = {
  high: "bg-warn-50 text-warn",
  medium: "bg-accent-50 text-accent",
  low: "bg-primary-50 text-primary",
  info: "bg-bg-soft text-ink-soft",
};

export default function AiInsights({ scope = "dashboard" }: { scope?: string }) {
  // Insights are derived from the same 30-day window the rest of the page
  // reads, and are expensive to generate server-side — so they are cached for
  // 10 minutes rather than regenerated on every mount.
  const { data, error, errorObj, loading, refetch } = useApi<AIInsight[]>(
    "/ai/insights",
    { scope },
    undefined,
    false,
    { staleTime: 10 * 60_000 },
  );
  const insights = data ?? [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 text-sm text-ink-muted">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        <span className="ml-2">Generating insights…</span>
      </div>
    );
  }

  if (error) {
    const isRateLimited = (errorObj as any)?.status === 429;
    return (
      <div className="rounded-xl border border-warn/30 bg-warn-50 p-4 text-sm text-warn">
        <p className="font-medium">{isRateLimited ? "Dashboard is busy" : "Couldn’t load insights"}</p>
        <p className="mt-1 opacity-80">{error}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-warn/20 bg-white px-3 py-1.5 text-xs font-medium text-warn shadow-sm hover:bg-white/90"
        >
          Retry
        </button>
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-ink-muted">
        No insights available for the current period.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {insights.map((it, i) => (
        <li key={i} className="flex gap-3 rounded-xl border border-border p-3.5">
          <span className={clsx("grid h-9 w-9 shrink-0 place-items-center rounded-lg", TONE[it.priority] ?? TONE.info)}>
            <Icon name="spark" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-medium text-ink">{it.title}</p>
            <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">{it.body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
