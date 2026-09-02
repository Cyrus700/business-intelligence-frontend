"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import { DUR, EASE, prefersReducedMotion, revealTrigger } from "@/lib/motion";
import { useLandingData } from "@/lib/landing-api";
import type { PlatformSnapshot } from "@/lib/landing-live";
import { STEPS } from "@/lib/content";

export default function HowItWorks({ live }: { live: PlatformSnapshot | null }) {
  const root = useRef<HTMLDivElement>(null);
  const { data } = useLandingData();
  const steps = data?.steps ?? STEPS;

  // One figure per step, and only the ones a visitor can read at face value.
  // Model versions and forecast-point counts meant nothing here, so they went.
  const metrics = live
    ? [
        {
          value: live.totals.records_unified.toLocaleString("en-IN"),
          label: `rows landed from ${live.totals.data_sources} sources`,
        },
        {
          value: `${live.pipeline.success_rate_pct}%`,
          label: `of ${live.totals.etl_jobs.toLocaleString("en-IN")} pipeline runs succeeded`,
        },
        {
          value: live.totals.insights.toLocaleString("en-IN"),
          label: "AI insights written for the dashboard",
        },
      ]
    : [null, null, null];

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const q = gsap.utils.selector(root);

      if (prefersReducedMotion()) return;

      // Connecting progress line scrubs with scroll.
      const fill = q("[data-steps-fill]")[0];
      if (fill) {
        gsap.fromTo(
          fill,
          { xPercent: -100 },
          {
            xPercent: 0,
            ease: "none",
            scrollTrigger: {
              trigger: el,
              start: "top 78%",
              end: "bottom 62%",
              scrub: 0.6,
            },
          },
        );
      }

      // Cards rise in sequence, badges pop as the line reaches them.
      gsap.from(q("[data-step-card]"), {
        y: 40,
        opacity: 0,
        duration: DUR.base,
        ease: EASE.out,
        stagger: 0.16,
        scrollTrigger: revealTrigger(el),
      });
      gsap.from(q("[data-step-badge]"), {
        scale: 0.7,
        opacity: 0,
        duration: DUR.fast,
        ease: EASE.pop,
        stagger: 0.18,
        delay: 0.15,
        scrollTrigger: revealTrigger(el),
      });
    },
    { scope: root, dependencies: [steps.length] },
  );

  return (
    <Section id="how" soft>
      <SectionHeading
        eyebrow="How it works"
        title={
          <>
            From data to decision in{" "}
            <span className="text-gradient">three steps</span>
          </>
        }
        subtitle="No data team and no long rollout. Connect your data and let the platform handle the analysis."
      />

      <div ref={root} className="relative mt-8 sm:mt-12 lg:mt-16">
        {/* Connecting progress line — scrubs with scroll, hidden on stacked mobile. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-[48px] hidden h-0.5 overflow-hidden rounded-full bg-border md:block"
        >
          <div
            data-steps-fill
            className="absolute inset-y-0 left-0 right-0 rounded-full bg-gradient-to-r from-primary via-violet to-accent"
          >
            <span className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 translate-x-1/2 rounded-full bg-accent ring-4 ring-accent/20" />
          </div>
        </div>

        <ol className="grid gap-4 sm:gap-5 lg:gap-6 md:grid-cols-3">
          {steps.map((step, i) => {
            const metric = metrics[i];
            return (
              <li key={step.no} data-step-card className="h-full min-w-0">
                <div className="surface-spotlight relative z-10 flex h-full flex-col gap-3 sm:gap-4 rounded-xl sm:rounded-2xl border border-border bg-white p-5 sm:p-6 lg:p-7 shadow-card transition-all duration-300 lg:hover:-translate-y-1 hover:border-primary/30 lg:hover:shadow-lift">
                  <span
                    data-step-badge
                    className="relative z-10 grid h-10 w-10 sm:h-11 sm:w-11 place-items-center rounded-xl bg-primary-50 font-mono text-base sm:text-lg font-semibold text-primary ring-4 ring-white shrink-0"
                  >
                    {step.no}
                  </span>
                  <h3 className="text-base sm:text-lg font-semibold text-ink leading-tight">{step.title}</h3>
                  <p className="flex-1 text-sm leading-relaxed text-ink-soft">
                    {step.body}
                  </p>

                  {/* Platform figure — omitted when the warehouse is unreachable,
                      so the card stays timeless rather than showing a stand-in. */}
                  {metric ? (
                    <div className="border-t border-border/60 pt-3 sm:pt-4">
                      <p className="font-mono text-xl sm:text-2xl font-semibold tabular-nums text-ink leading-none">
                        {metric.value}
                      </p>
                      <p className="mt-1 text-xs leading-tight text-ink-muted break-words">{metric.label}</p>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </Section>
  );
}
