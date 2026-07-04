import { clsx } from "@/lib/cx";

export function PanelSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx("animate-pulse rounded-2xl border border-border bg-bg-soft", className)}
      aria-label="Loading"
    />
  );
}

export function PanelError({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-warn/30 bg-warn-50 p-4 text-sm text-warn">
      <p className="font-medium">Couldn’t load data</p>
      <p className="mt-1 opacity-80">{message}</p>
    </div>
  );
}

export function EmptyState({ label = "No data for this period" }: { label?: string }) {
  return (
    <div className="flex h-40 items-center justify-center text-sm text-ink-muted">{label}</div>
  );
}
