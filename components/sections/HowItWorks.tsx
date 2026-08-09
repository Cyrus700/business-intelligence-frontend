"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import { DUR, EASE, prefersReducedMotion, revealTrigger } from "@/lib/motion";
import { useLandingData, useLandingLive } from "@/lib/landing-api";
import { STEPS } from "@/lib/content";

export default function HowItWorks() {
  const root = useRef<HTMLDivElement>(null);
  const { data } = useLandingData();
  const { data: live } = useLandingLive();
  const steps = data?.steps ?? STEPS;

  // What each stage has actually done in this deployment.
  const metrics = [
    live && {
      value: live.totals.records_unified.toLocaleString("en-IN"),
      label: `rows landed from ${live.totals.data_sources} sources`,
    },
    live && {
      value: live.totals.forecast_points.toLocaleString("en-IN"),
      label: `forecast points from ${live.totals.models_trained} trained models`,
    },
    live && {
      value: live.totals.insights.toLocaleString("en-IN"),
      label: `written insights · ${live.totals.anomalies_open} awaiting triage`,
    },
  ];

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

      <div ref={root} className="relative mt-16">
        {/* Connecting progress line — scrubs with scroll, hidden on stacked mobile. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-[50px] hidden h-0.5 overflow-hidden rounded-full bg-border md:block"
        >
          <div
            data-steps-fill
            className="absolute inset-y-0 left-0 right-0 rounded-full bg-gradient-to-r from-primary via-violet to-accent"
          >
            <span className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 translate-x-1/2 rounded-full bg-accent ring-4 ring-accent/20" />
          </div>
        </div>

        <ol className="grid gap-6 md:grid-cols-3">
          {steps.map((step, i) => {
            const metric = metrics[i];
            return (
              <li key={step.no} data-step-card className="h-full">
                <div className="surface-spotlight relative z-10 flex h-full flex-col gap-4 rounded-2xl border border-border bg-white p-7 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lift">
                  <span
                    data-step-badge
                    className="relative z-10 grid h-11 w-11 place-items-center rounded-xl bg-primary-50 font-mono text-lg font-semibold text-primary ring-4 ring-white"
                  >
                    {step.no}
                  </span>
                  <h3 className="text-lg font-semibold text-ink">{step.title}</h3>
                  <p className="flex-1 text-sm leading-relaxed text-ink-soft">
                    {step.body}
                  </p>

                  {/* What this stage has produced here, right now. */}
                  <div className="border-t border-border/70 pt-4">
                    {metric ? (
                      <>
                        <p className="font-mono text-2xl font-semibold tabular-nums text-ink">
                          {metric.value}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-muted">{metric.label}</p>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <div className="h-6 w-24 animate-pulse rounded bg-bg-soft" />
                        <div className="h-3 w-36 animate-pulse rounded bg-bg-soft" />
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </Section>
  );
}
