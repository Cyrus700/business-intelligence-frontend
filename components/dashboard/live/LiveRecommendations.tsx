"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiGet, queryKeys } from "@/lib/api";
import { clsx } from "@/lib/cx";
import { useDashboardBase } from "@/lib/use-role";
import { PanelSkeleton, PanelError } from "./Status";

type Recommendation = {
  title: string;
  body: string;
  insight_type: string;
  severity: string;
  evidence: Record<string, unknown> | null;
};

const SEV_DOT: Record<string, { dot: string; label: string }> = {
  warning: { dot: "bg-warn", label: "Action" },
  info: { dot: "bg-primary", label: "Opportunity" },
};

export default function LiveRecommendations({ limit = 4 }: { limit?: number }) {
  const base = useDashboardBase();
  const { data, isLoading, error } = useQuery<Recommendation[]>({
    queryKey: queryKeys.recommendations.list(),
    queryFn: () => apiGet<Recommendation[]>("/recommendations"),
    staleTime: 120_000,
  });

  if (error) return <PanelError message="Failed to load recommendations" />;
  if (isLoading || !data) return <PanelSkeleton className="h-48" />;

  const items = data.slice(0, limit);
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-6 text-center text-sm text-ink-muted">
        <p>No recommendations yet.</p>
        <Link href={`${base}/recommendations`} className="mt-2 text-primary underline">
          Generate recommendations
        </Link>
      </div>
    );
  }

  return (
    <div>
      <ul className="space-y-2">
        {items.map((r, i) => {
          const sev = SEV_DOT[r.severity] ?? SEV_DOT.info;
          return (
            <li
              key={i}
              className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-bg-soft"
            >
              <span className={clsx("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", sev.dot)} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{r.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-ink-soft">{r.body}</p>
              </div>
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                {sev.label}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 border-t border-border pt-2 text-center">
        <Link
          href={`${base}/recommendations`}
          className="text-xs font-medium text-primary hover:underline"
        >
          View all recommendations →
        </Link>
      </div>
    </div>
  );
}
