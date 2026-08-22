"use client";

import { clsx } from "@/lib/cx";
import Icon, { type IconName } from "@/components/ui/Icon";
import Button from "@/components/ui/Button";

export interface EmptyStateProps {
  /** Main message */
  message: string;
  /** Optional description */
  description?: string;
  /** Icon name */
  icon?: IconName;
  /** Primary action */
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: IconName;
  };
  /** Secondary action */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Custom className */
  className?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Inline or block */
  inline?: boolean;
}

/** Generic empty state */
export function EmptyState({
  message,
  description,
  icon = "inbox",
  primaryAction,
  secondaryAction,
  className,
  size = "md",
  inline = false,
}: EmptyStateProps) {
  const sizes = {
    sm: { icon: "h-8 w-8", text: "text-sm", title: "text-base", gap: "gap-2", pad: "p-4" },
    md: { icon: "h-12 w-12", text: "text-base", title: "text-lg", gap: "gap-3", pad: "p-6" },
    lg: { icon: "h-16 w-16", text: "text-lg", title: "text-xl", gap: "gap-4", pad: "p-8" },
  };

  const s = sizes[size];

  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center text-center rounded-2xl border border-border bg-white",
        s.pad,
        inline ? "inline-flex" : "flex",
        className
      )}
    >
      <Icon name={icon} className={clsx("text-ink-muted", s.icon)} aria-hidden="true" />
      <div className={clsx("space-y-2", s.gap)}>
        <p className={clsx("font-medium text-ink", s.title)}>{message}</p>
        {description && <p className="text-ink-muted">{description}</p>}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-2">
          {primaryAction && (
            <Button
              onClick={primaryAction.onClick}
              className="gap-1.5"
              size="md"
            >
              {primaryAction.icon && <Icon name={primaryAction.icon!} className="h-4 w-4" />}
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="ghost"
              onClick={secondaryAction.onClick}
              size="md"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Full-page empty state */
export function PageEmpty({
  message = "No data available",
  description,
  primaryAction,
}: { message?: string; description?: string; primaryAction?: { label: string; onClick: () => void; icon?: IconName } }) {
  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-white">
      <div className="text-center space-y-4 p-8 rounded-2xl border border-border bg-white max-w-md mx-4">
        <Icon name="inbox" className="mx-auto text-ink-muted h-16 w-16" aria-hidden="true" />
        <div>
          <h1 className="text-2xl font-bold text-ink">{message}</h1>
          {description && <p className="mt-2 text-ink-muted">{description}</p>}
        </div>
        {primaryAction && (
          <Button onClick={primaryAction.onClick} className="mt-4">
            {primaryAction.icon && <Icon name={primaryAction.icon!} className="h-4 w-4 mr-2" />}
            {primaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}

/** Section-level empty state (smaller) */
export function SectionEmpty({
  message = "No items",
  description,
  action,
}: { message?: string; description?: string; action?: { label: string; onClick: () => void; icon?: IconName } }) {
  return (
    <div className="p-8 rounded-xl border border-border bg-white text-center">
      <Icon name="inbox" className="mx-auto text-ink-muted h-10 w-10 mb-3" aria-hidden="true" />
      <p className="font-medium text-ink">{message}</p>
      {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      {action && (
        <Button onClick={action.onClick} className="mt-4 gap-1.5">
          {action.icon && <Icon name={action.icon} className="h-4 w-4" />}
          {action.label}
        </Button>
      )}
    </div>
  );
}

/** Table empty state (shown inside table container) */
export function TableEmpty({
  message = "No records found",
  description,
  action,
}: { message?: string; description?: string; action?: { label: string; onClick: () => void; icon?: IconName } }) {
  return (
    <div className="px-6 py-12 text-center">
      <Icon name="table" className="mx-auto text-ink-muted h-10 w-10 mb-3" aria-hidden="true" />
      <p className="font-medium text-ink">{message}</p>
      {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      {action && (
        <Button onClick={action.onClick} className="mt-4 gap-1.5">
          {action.icon && <Icon name={action.icon} className="h-4 w-4" />}
          {action.label}
        </Button>
      )}
    </div>
  );
}

/** Chart empty state */
export function ChartEmpty({
  message = "No data to display",
  description,
  action,
}: { message?: string; description?: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="h-64 flex items-center justify-center rounded-xl border border-border bg-white">
      <div className="text-center space-y-3 p-4">
        <Icon name="chart" className="mx-auto text-ink-muted h-12 w-12" aria-hidden="true" />
        <p className="font-medium text-ink">{message}</p>
        {description && <p className="text-ink-muted">{description}</p>}
        {action && (
          <Button onClick={action.onClick} className="mx-auto gap-1.5">
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
}