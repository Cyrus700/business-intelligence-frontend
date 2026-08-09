"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Icon from "@/components/ui/Icon";
import { DUR, EASE, pointerSpotlight, prefersReducedMotion } from "@/lib/motion";
import { useLandingLive, useLandingData } from "@/lib/landing-api";
import { FEATURES } from "@/lib/content";
import { nprCompact } from "@/lib/api";

type IconName = "chart" | "trend" | "alert" | "spark" | "pipe" | "lock";

export default function Features() {
  const root = useRef<HTMLDivElement>(null);
  const { data } = useLandingData();
  const { data: live } = useLandingLive();
  const features = data?.features ?? FEATURES;

  // Each capability carries the figure that proves it is actually running.
  // Keyed by icon so it survives copy edits on the backend.
  const proofByIcon: Record<string, string | null> = {
    chart: live ? `${live.totals.kpi_points.toLocaleString("en-IN")} KPI points live` : null,
    trend: live
      ? `${live.totals.forecast_points} forecast points · ${live.totals.models_trained} models`
      : null,
    alert: live
      ? `${live.totals.anomalies_total} detected · ${live.totals.anomalies_open} open`
      : null,
    spark: live ? `${live.totals.insights} insights written` : null,
    pipe: live
      ? `${live.totals.data_sources} sources · ${live.pipeline.success_rate_pct}% ETL success`
      : null,
    lock: live ? `${nprCompact(live.totals.revenue)} under role-based access` : null,
  };

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const cards = gsap.utils.toArray<HTMLElement>("[data-feature]", el);
      const cleanups: Array<() => void> = [];

      if (prefersReducedMotion()) {
        gsap.set(cards, { opacity: 1, y: 0, scale: 1 });
        return;
      }

      // Grid-aware stagger so cards arrive row by row — reads far better than
      // one long sequential cascade across a 3-column grid.
      gsap.from(cards, {
        y: 34,
        opacity: 0,
        scale: 0.97,
        duration: DUR.base,
        ease: EASE.out,
        stagger: { each: 0.08, grid: "auto", from: "start" },
        scrollTrigger: { trigger: el, start: "top 80%", once: true },
      });

      cards.forEach((card) => cleanups.push(pointerSpotlight(card)));
      return () => cleanups.forEach((fn) => fn());
    },
    { scope: root, dependencies: [features.length] },
  );

  return (
    <Section id="features">
      <SectionHeading
        eyebrow="Everything in one place"
        title={
          <>
            One platform, the whole{" "}
            <span className="text-gradient">decision loop</span>
          </>
        }
        subtitle="From raw data to a recommended next step — Insightful covers every stage, so your team never leaves the dashboard."
      />

      <div ref={root} className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => {
          const proof = proofByIcon[f.icon];
          return (
            <article
              key={f.title}
              data-feature
              className="surface-spotlight group flex h-full flex-col rounded-2xl border border-border bg-white p-7 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lift"
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary-50 text-primary transition-all duration-300 group-hover:-rotate-3 group-hover:scale-110 group-hover:bg-primary group-hover:text-white">
                <Icon name={f.icon as IconName} className="h-6 w-6" />
              </span>
              <h3 className="mt-5 text-lg font-semibold text-ink">{f.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">
                {f.body}
              </p>

              {/* Live proof — the capability's own number, straight from the DB. */}
              <p className="mt-5 border-t border-border/70 pt-4 font-mono text-xs tabular-nums text-ink-muted">
                {proof ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    {proof}
                  </span>
                ) : (
                  <span className="inline-block h-3 w-32 animate-pulse rounded bg-bg-soft align-middle" />
                )}
              </p>
            </article>
          );
        })}
      </div>
    </Section>
  );
}
