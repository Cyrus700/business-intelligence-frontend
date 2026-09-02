"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { DUR, EASE, parallax, prefersReducedMotion } from "@/lib/motion";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import LiveDashboard from "@/components/ui/LiveDashboard";
import Icon from "@/components/ui/Icon";
import type { PlatformSnapshot } from "@/lib/landing-live";

// The panel plus three short "what the dashboard gives you" cards.
//
// The side cards used to print internal registry details — champion model type,
// version number, training date, raw counters. That is operator data, not
// something a visitor evaluating the product can act on, so the cards now
// describe capabilities and carry at most one figure each. Repeating the
// panel's numbers beside the panel was the other half of the noise.

export default function DashboardPreview({
  live,
  lastRunLabel,
}: {
  live: PlatformSnapshot | null;
  lastRunLabel: string | null;
}) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const q = gsap.utils.selector(root);

      if (prefersReducedMotion()) {
        gsap.set(q("[data-preview], [data-side], [data-panel-row], [data-dim-bar]"), {
          opacity: 1,
          y: 0,
          scale: 1,
          scaleX: 1,
        });
        return;
      }

      gsap.from(q("[data-preview]"), {
        y: 64,
        scale: 0.95,
        opacity: 0,
        duration: DUR.slow,
        ease: EASE.expo,
        scrollTrigger: { trigger: el, start: "top 78%", once: true },
      });

      gsap.from(q("[data-side]"), {
        x: 32,
        opacity: 0,
        duration: DUR.base,
        ease: EASE.out,
        stagger: 0.12,
        scrollTrigger: { trigger: el, start: "top 72%", once: true },
      });

      const drift = q("[data-preview-drift]")[0];
      if (drift) parallax(drift, 36, el);

      gsap.from(q("[data-dim-bar]"), {
        scaleX: 0,
        transformOrigin: "left",
        duration: 0.8,
        ease: EASE.out,
        stagger: 0.08,
        scrollTrigger: { trigger: el, start: "top 70%", once: true },
      });
    },
    { scope: root },
  );

  const cards: Array<{
    icon: "spark" | "trend" | "pipe";
    tone: string;
    title: string;
    body: string;
    figure: { value: string; label: string } | null;
  }> = [
    {
      icon: "spark",
      tone: "bg-primary-50 text-primary",
      title: "Written insights",
      body: "Every trend and anomaly arrives in plain language: what changed, why it likely changed, and what to do next.",
      figure: live
        ? {
            value: live.totals.insights.toLocaleString("en-IN"),
            label: "insights written so far",
          }
        : null,
    },
    {
      icon: "trend",
      tone: "bg-accent-50 text-accent",
      title: "Forecasts you can plan against",
      body: "Models retrain on your own history and publish revenue and demand forecasts with confidence bands.",
      figure: null,
    },
    {
      icon: "pipe",
      tone: "bg-primary-50 text-primary",
      title: "Pipelines that run themselves",
      body: "Scheduled ETL keeps every source in step, and a failed run raises an alert instead of quietly going stale.",
      figure: live
        ? {
            value: `${live.pipeline.success_rate_pct}%`,
            label: lastRunLabel
              ? `of runs succeeded · last run ${lastRunLabel}`
              : "of pipeline runs succeeded",
          }
        : null,
    },
  ];

  return (
    <section className="relative overflow-hidden py-12 sm:py-16 lg:py-20 xl:py-28">
      <div className="dot-grid pointer-events-none absolute inset-0 -z-10 opacity-70 sm:opacity-100" aria-hidden />
      <Container>
        <SectionHeading
          eyebrow="The dashboard"
          title={
            <>
              Built to be read <span className="text-gradient">at a glance</span>
            </>
          }
          subtitle="The panel your team opens every morning — warehouse scale, pipeline health, and the AI layer working underneath."
        />

        <div
          ref={root}
          className="mt-8 grid items-start gap-5 sm:mt-12 sm:gap-6 lg:mt-16 lg:grid-cols-[1.45fr_1fr]"
        >
          <div data-preview className="min-w-0 will-change-transform">
            <div data-preview-drift className="min-w-0">
              <LiveDashboard live={live} lastRunLabel={lastRunLabel} className="shadow-hero" />
            </div>
          </div>

          <div className="grid min-w-0 gap-4">
            {cards.map((card) => (
              <article
                key={card.title}
                data-side
                className="surface-ring min-w-0 rounded-xl border border-border bg-white p-5 shadow-card sm:rounded-2xl sm:p-6"
              >
                <div className="flex items-center gap-2.5">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${card.tone}`}>
                    <Icon name={card.icon} className="h-4 w-4" />
                  </span>
                  <h3 className="truncate text-sm font-semibold text-ink">{card.title}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{card.body}</p>
                {card.figure ? (
                  <p className="mt-4 border-t border-border/60 pt-3.5">
                    <span className="font-mono text-xl font-semibold leading-none tabular-nums text-ink">
                      {card.figure.value}
                    </span>
                    <span className="mt-1.5 block text-xs leading-tight text-ink-muted">
                      {card.figure.label}
                    </span>
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
