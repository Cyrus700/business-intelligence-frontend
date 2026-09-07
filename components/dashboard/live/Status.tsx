import { useEffect, useState } from "react";
import { clsx } from "@/lib/cx";
import Icon from "@/components/ui/Icon";
import type { ApiError } from "@/lib/api";

export function PanelSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      className={clsx(
        "animate-pulse rounded-2xl border border-border bg-bg-soft",
        className,
      )}
    />
  );
}

type PanelErrorProps = {
  message?: string;
  details?: string;
  error?: ApiError | string | null;
  onRetry?: () => void;
  retryLabel?: string;
};

export function PanelError({ message, details, error, onRetry, retryLabel = "Retry" }: PanelErrorProps) {
  const err = typeof error === "string" ? null : (error as ApiError | null);
  const status = err?.status;
  const retryAfter = err?.retryAfter;
  const isRateLimited = status === 429;
  const isAuth = status === 401 || status === 403;
  const isNotFound = status === 404;
  const isServer = status !== undefined && status >= 500;

  // Live countdown for 429 Retry-After
  const [countdown, setCountdown] = useState<number | null>(retryAfter ?? null);
  useEffect(() => {
    if (!isRateLimited || retryAfter === undefined) return;
    setCountdown(retryAfter);
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c === null || c <= 1) {
          clearInterval(t);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [isRateLimited, retryAfter]);

  // Resolve title / icon / tone
  let title = "Couldn’t load data";
  let icon: string = "alert";
  let tone = "border-warn/30 bg-warn-50 text-warn";
  let detailText = details ?? (typeof message === "string" ? message : undefined) ?? err?.message ?? "Request failed. Please retry.";
  if (isRateLimited) {
    title = "Dashboard is busy";
    icon = "clock";
    tone = "border-amber-200 bg-amber-50 text-amber-800";
    detailText = countdown !== null && countdown > 0
      ? `Too many requests — retrying in ${countdown}s. You can also retry manually.`
      : "Too many requests — please wait a moment and retry.";
  } else if (isAuth) {
    title = status === 401 ? "Session expired" : "No permission";
    icon = "lock";
    tone = "border-primary/20 bg-primary-50 text-primary-700";
    detailText = status === 401 ? "Please sign in again to continue." : "You don’t have permission to view this data.";
  } else if (isNotFound) {
    title = "No data found";
    icon = "search";
    tone = "border-border bg-bg-soft text-ink-soft";
    detailText = "No data exists for the selected period/filters.";
  } else if (isServer) {
    title = "Server error";
    icon = "alert";
    tone = "border-destructive/20 bg-destructive-50 text-destructive";
    detailText = "The server had a hiccup. Retrying automatically…";
  }

  // Fallback to legacy `message` prop if `error` not given
  if (!err && message) detailText = message;

  return (
    <div className={clsx("rounded-2xl border p-4 text-sm", tone)} role="alert">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/80">
          <Icon name={icon as any} className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium leading-tight">{title}</p>
          <p className="mt-1 break-words text-[13px] leading-relaxed opacity-90">{detailText}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-current/20 bg-white px-3 py-1.5 text-xs font-medium shadow-sm transition hover:bg-white/90"
            >
              <Icon name="refresh" className="h-3.5 w-3.5" />
              {retryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ label = "No data for this period" }: { label?: string }) {
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-ink-muted">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-bg-soft">
        <Icon name="chart" className="h-5 w-5" />
      </span>
      {label}
    </div>
  );
}