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
import type { PlatformSnapshot } from "@/lib/landing-live";

type Cell = {
  label: string;
  to: number;
  decimals?: number;
  suffix?: string;
  /** Formats the animating number (thousands separators…). */
  format?: (v: number) => string;
  note: string;
};

// Three figures a visitor can actually act on: how much data the platform has
// unified, how many sources feed it, and whether the pipelines are healthy.
// Internal counters (KPI points, forecast points, model versions) are plumbing,
// not proof, so they stay out of the marketing page.

export default function Stats({
  live,
  lastRunLabel,
}: {
  live: PlatformSnapshot | null;
  lastRunLabel: string | null;
}) {
  const root = useRef<HTMLDivElement>(null);

  const cells: Cell[] = live
    ? [
        {
          label: "Rows unified",
          to: live.totals.records_unified,
          format: (v) => Math.round(v).toLocaleString("en-IN"),
          note: "sales, finance & inventory in one warehouse",
        },
        {
          label: "Data sources",
          to: live.totals.data_sources,
          format: (v) => Math.round(v).toLocaleString("en-IN"),
          note: "CSV · Excel · PostgreSQL · REST APIs",
        },
        {
          label: "ETL success rate",
          to: live.pipeline.success_rate_pct,
          decimals: 1,
          suffix: "%",
          note: `across ${live.totals.etl_jobs.toLocaleString("en-IN")} pipeline runs`,
        },
      ]
    : [];

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

      gsap.utils.toArray<HTMLElement>("[data-counter]", band).forEach((node) => {
        const to = Number(node.dataset.to);
        if (!Number.isFinite(to)) return;
        const decimals = Number(node.dataset.decimals ?? 0);
        const cell = cells.find((c) => c.label === node.dataset.label);
        const format = cell?.format ?? ((v: number) => v.toFixed(decimals));

        if (reduce) {
          node.textContent = format(to);
          return;
        }
        countUp(node, to, { decimals, format, trigger: band });
      });
    },
    { scope: root, dependencies: [live] },
  );

  // Nothing to show without a reachable warehouse — better a shorter page than
  // a band of placeholder numbers.
  if (!live) return null;

  return (
    <section className="relative py-12 sm:py-16 lg:py-20 xl:py-24">
      <div ref={root} className="container-page">
        <div className="mb-8 flex flex-col items-center gap-2 px-2 text-center sm:mb-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-[11px] font-medium text-ink-soft shadow-sm">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-accent text-accent" />
            Live from the platform warehouse
          </span>
          {lastRunLabel ? (
            <p className="max-w-full break-words text-center text-xs text-ink-muted sm:text-sm">
              Last pipeline run {lastRunLabel}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border shadow-card sm:rounded-2xl sm:grid-cols-3">
          {cells.map((c) => (
            <div
              key={c.label}
              data-stat
              className="surface-spotlight group flex flex-col items-center gap-1 bg-white px-5 py-7 text-center transition-colors duration-300 hover:bg-primary-50/40 sm:gap-1.5 sm:px-6 sm:py-8 lg:py-10"
            >
              <p className="font-mono text-2xl font-semibold leading-none tracking-tight text-primary sm:text-3xl lg:text-4xl xl:text-[2.6rem]">
                <span
                  data-counter
                  data-label={c.label}
                  data-to={c.to}
                  data-decimals={c.decimals ?? 0}
                  className="tabular-nums"
                >
                  {c.format ? c.format(c.to) : c.to.toFixed(c.decimals ?? 0)}
                </span>
                {c.suffix ?? ""}
              </p>
              <p className="mt-1 text-sm font-medium text-ink">{c.label}</p>
              <p className="mt-1 max-w-[28ch] text-balance text-xs leading-relaxed text-ink-muted">
                {c.note}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
