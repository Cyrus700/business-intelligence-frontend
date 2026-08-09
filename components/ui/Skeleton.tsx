import { clsx } from "@/lib/cx";

// Shimmer placeholder shown while landing data is still in flight. Keeps
// layout steady so the page never pops when the real figures arrive.
export default function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={clsx("block animate-pulse rounded bg-bg-soft", className)}
    />
  );
}