import { clsx } from "@/lib/cx";
import Icon from "@/components/ui/Icon";

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

export function PanelError({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-warn/30 bg-warn-50 p-4 text-sm text-warn">
      <p className="font-medium">Couldn’t load data</p>
      <p className="mt-1 break-words opacity-80">{message}</p>
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