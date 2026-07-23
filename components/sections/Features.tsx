"use client";

import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import Icon from "@/components/ui/Icon";
import { useLandingData } from "@/lib/landing-api";
import { FEATURES } from "@/lib/content";

type IconName = "chart" | "trend" | "alert" | "spark" | "pipe" | "lock";

export default function Features() {
  const { data } = useLandingData();
  const features = data?.features ?? FEATURES;

  return (
    <Section id="features">
      <SectionHeading
        eyebrow="Everything in one place"
        title="One platform, the whole decision loop"
        subtitle="From raw data to a recommended next step — Insightful covers every stage, so your team never leaves the dashboard."
      />

      <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <Reveal key={f.title} delay={(i % 3) * 0.08}>
            <div className="group h-full rounded-2xl border border-border bg-white p-7 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary-50 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                <Icon name={f.icon as IconName} className="h-6 w-6" />
              </span>
              <h3 className="mt-5 text-lg font-semibold text-ink">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{f.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
