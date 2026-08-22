"use client";

import { clsx } from "@/lib/cx";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";

export interface ErrorStateProps {
  /** Error message */
  message: string;
  /** Optional details */
  details?: string;
  /** Retry callback */
  onRetry?: () => void;
  /** Retry button text */
  retryLabel?: string;
  /** Custom className */
  className?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Inline or block */
  inline?: boolean;
}

/** Generic error state with retry option */
export function ErrorState({
  message,
  details,
  onRetry,
  retryLabel = "Try again",
  className,
  size = "md",
  inline = false,
}: ErrorStateProps) {
  const sizes = {
    sm: { icon: "h-5 w-5", text: "text-sm", gap: "gap-1.5", pad: "p-3" },
    md: { icon: "h-8 w-8", text: "text-base", gap: "gap-2", pad: "p-4" },
    lg: { icon: "h-12 w-12", text: "text-lg", gap: "gap-3", pad: "p-6" },
  };

  const s = sizes[size];

  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center text-center rounded-xl border border-destructive/20 bg-destructive-50",
        s.pad,
        inline ? "inline-flex" : "flex",
        className
      )}
      role="alert"
    >
      <Icon name="alert" className={clsx("text-destructive", s.icon)} aria-hidden="true" />
      <div className={clsx("space-y-2", s.gap)}>
        <p className={clsx("font-medium text-destructive", s.text)}>{message}</p>
        {details && <p className="text-sm text-ink-muted">{details}</p>}
        {onRetry && (
          <Button
            variant="outline"
            onClick={onRetry}
            className="mt-2"
            size="md"
          >
            <Icon name="refresh" className="h-4 w-4 mr-1" />
            {retryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

/** Full-page error */
export function PageError({
  message = "Something went wrong",
  details,
  onRetry,
}: { message?: string; details?: string; onRetry?: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm">
      <div className="text-center space-y-4 p-8 rounded-2xl border border-border bg-white shadow-xl max-w-md mx-4">
        <Icon name="alert" className="mx-auto text-destructive h-16 w-16" aria-hidden="true" />
        <div>
          <h1 className="text-2xl font-bold text-ink">{message}</h1>
          {details && <p className="mt-2 text-sm text-ink-muted">{details}</p>}
        </div>
        {onRetry && (
          <Button onClick={onRetry} className="mt-2">
            <Icon name="refresh" className="h-4 w-4 mr-2" />
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}

/** Inline error banner (for section-level errors) */
export function ErrorBanner({
  message,
  details,
  onDismiss,
  onRetry,
}: { message: string; details?: string; onDismiss?: () => void; onRetry?: () => void }) {
  return (
    <div
      className="flex items-start gap-3 p-4 rounded-xl border border-destructive/20 bg-destructive-50"
      role="alert"
    >
      <Icon name="alert" className="text-destructive h-5 w-5 mt-0.5 shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-destructive">{message}</p>
        {details && <p className="mt-1 text-sm text-ink-muted">{details}</p>}
        <div className="mt-3 flex items-center gap-2">
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <Icon name="refresh" className="h-3.5 w-3.5 mr-1" />
              Retry
            </Button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-sm text-destructive hover:underline"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}