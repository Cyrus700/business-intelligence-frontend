"use client";

import { clsx } from "@/lib/cx";
import { prefersReducedMotion } from "@/lib/motion";
import BrandLogo from "@/components/ui/BrandLogo";

// Full-screen preloader shown while the landing queries are still pending.
// It fades out once the data resolves so the page reveals cleanly.

export default function LandingLoader({ leaving = false }: { leaving?: boolean }) {
  const reduce = prefersReducedMotion();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading live platform data"
      className={clsx(
        "fixed inset-0 z-[90] flex flex-col items-center justify-center gap-8 bg-white transition-all duration-500 ease-out",
        leaving ? "pointer-events-none scale-[1.04] opacity-0" : "opacity-100",
      )}
    >
      <div className="relative grid place-items-center">
        <span
          className={clsx(
            "h-20 w-20 rounded-full border-2",
            reduce ? "border-primary/40" : "animate-spin border-primary/20 border-t-primary",
          )}
          style={reduce ? undefined : { animationDuration: "1.1s" }}
        />
        <BrandLogo
          variant="mark"
          height={48}
          priority
          imgClassName="rounded-2xl"
          className="absolute"
        />
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-sm font-medium text-ink">Loading the live workspace…</p>
        <p className="text-xs text-ink-muted">
          Wiring the platform to your warehouse
        </p>
      </div>

      <div className="h-1 w-52 overflow-hidden rounded-full bg-bg-soft">
        <span
          className={clsx(
            "block h-full rounded-full bg-gradient-to-r from-primary via-violet to-accent",
            reduce ? "w-full opacity-40" : "w-1/4 animate-[loader-progress_1.6s_ease-in-out_infinite]",
          )}
        />
      </div>
    </div>
  );
}