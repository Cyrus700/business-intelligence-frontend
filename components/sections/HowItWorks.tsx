"use client";

import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { useLandingData } from "@/lib/landing-api";
import { STEPS } from "@/lib/content";

export default function HowItWorks() {
  const { data } = useLandingData();
  const steps = data?.steps ?? STEPS;

  return (
    <Section id="how" soft>
      <SectionHeading
        eyebrow="How it works"
        title="From data to decision in three steps"
        subtitle="No data team and no long rollout. Connect your data and let the platform handle the analysis."
      />

      <ol className="mt-16 grid gap-6 md:grid-cols-3">
        {steps.map((step, i) => (
          <Reveal key={step.no} as="li" delay={i * 0.08} className="h-full">
            <div className="flex h-full flex-col gap-4 rounded-2xl border border-border bg-white p-7 shadow-card">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-50 font-mono text-lg font-semibold text-primary">
                {step.no}
              </span>
              <h3 className="text-lg font-semibold text-ink">{step.title}</h3>
              <p className="text-sm leading-relaxed text-ink-soft">{step.body}</p>
            </div>
          </Reveal>
        ))}
      </ol>
    </Section>
  );
}
