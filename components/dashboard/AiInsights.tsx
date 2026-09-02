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
  const { data, error, loading } = useApi<AIInsight[]>(
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
    return (
      <div className="rounded-xl bg-warn-50 px-4 py-3 text-sm text-warn">{error}</div>
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
