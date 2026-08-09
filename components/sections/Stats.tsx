"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  countUp,
  DUR,
  EASE,
  prefersReducedMotion,
  revealTrigger,
} from "@/lib/motion";
import { useLandingLive } from "@/lib/landing-api";
import Skeleton from "@/components/ui/Skeleton";

type Cell = {
  label: string;
  /** Numeric target for the count-up; null renders a skeleton instead. */
  to: number | null;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** Formats the animating number (compact currency, thousands separators…). */
  format?: (v: number) => string;
  note: string;
};

export default function Stats() {
  const root = useRef<HTMLDivElement>(null);
  const { data: live, loading } = useLandingLive();

  const t = live?.totals;
  const p = live?.pipeline;

  // Platform-scale figures only — no revenue, orders or margins.
  const cells: Cell[] = [
    {
      label: "Rows unified",
      to: t?.records_unified ?? null,
      format: (v) => Math.round(v).toLocaleString("en-IN"),
      note: `sales, finance & inventory across ${t?.data_sources ?? "—"} sources`,
    },
    {
      label: "Data sources",
      to: t?.data_sources ?? null,
      format: (v) => Math.round(v).toLocaleString("en-IN"),
      note: "CSV · Excel · PostgreSQL · REST APIs",
    },
    {
      label: "ETL success rate",
      to: p?.success_rate_pct ?? null,
      decimals: 1,
      suffix: "%",
      note: `${t?.etl_jobs ?? "—"} ETL runs processed`,
    },
    {
      label: "AI insights written",
      to: t?.insights ?? null,
      format: (v) => Math.round(v).toLocaleString("en-IN"),
      note: `${t?.forecast_points ?? "—"} forecast points`,
    },
  ];

  useGSAP(
    () => {
      const band = root.current;
      if (!band) return;
      const reduce = prefersReducedMotion();

      const items = gsap.utils.toArray<HTMLElement>("[data-stat]", band);
      if (reduce) {
        gsap.set(items, { opacity: 1, y: 0 });
      } else {
        gsap.from(items, {
          y: 26,
          opacity: 0,
          duration: DUR.base,
          ease: EASE.out,
          stagger: 0.09,
          scrollTrigger: revealTrigger(band),
        });
      }

      // Count-ups only run once the real numbers have arrived.
      gsap.utils.toArray<HTMLElement>("[data-counter]", band).forEach((node) => {
        const to = Number(node.dataset.to);
        if (!Number.isFinite(to)) return;
        const decimals = Number(node.dataset.decimals ?? 0);
        const cell = cells.find((c) => c.label === node.dataset.label);
        const format =
          cell?.format ?? ((v: number) => v.toFixed(decimals));

        if (reduce) {
          node.textContent = format(to);
          return;
        }
        countUp(node, to, { decimals, format, trigger: band });
      });
    },
    { scope: root, dependencies: [live] },
  );

  return (
    <section className="relative py-20 md:py-24">
      <div ref={root} className="container-page">
        <div className="mb-10 flex flex-col items-center gap-2 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-[11px] font-medium text-ink-soft">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-accent text-accent" />
            Live from the platform warehouse
          </span>
          <p className="text-sm text-ink-muted">
            {live?.pipeline.last_run_at
              ? `Last ETL run ${new Date(live.pipeline.last_run_at).toLocaleString("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}`
              : "Connecting to the warehouse…"}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-card sm:grid-cols-2 lg:grid-cols-4">
          {cells.map((c) => (
            <div
              key={c.label}
              data-stat
              className="surface-spotlight group flex flex-col items-center gap-1.5 bg-white px-6 py-10 text-center transition-colors duration-300 hover:bg-primary-50/40"
            >
              <p className="font-mono text-4xl font-semibold tracking-tight text-primary md:text-[2.75rem]">
                {c.prefix ?? ""}
                {c.to === null ? (
                  <Skeleton className="mx-auto h-8 w-24" />
                ) : (
                  <span
                    data-counter
                    data-label={c.label}
                    data-to={c.to}
                    data-decimals={c.decimals ?? 0}
                    className="tabular-nums"
                  >
                    {c.format ? c.format(c.to) : c.to.toFixed(c.decimals ?? 0)}
                  </span>
                )}
                {c.suffix ?? ""}
              </p>
              <p className="text-sm font-medium text-ink">{c.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                {loading && c.to === null ? (
                  <Skeleton className="mx-auto h-3 w-40" />
                ) : (
                  c.note
                )}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
