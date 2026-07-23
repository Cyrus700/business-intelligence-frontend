"use client";

import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { clsx } from "@/lib/cx";
import { useLandingData } from "@/lib/landing-api";
import { PRICING } from "@/lib/content";

export default function Pricing() {
  const { data } = useLandingData();
  const tiers = data?.pricing ?? PRICING;

  return (
    <Section id="pricing" soft>
      <SectionHeading
        eyebrow="Pricing"
        title="Priced for SMEs, ready for scale"
        subtitle="Start free, pay only for what you use, and upgrade when you grow. No upfront hardware, no enterprise lock-in."
      />

      <div className="mt-16 grid items-stretch gap-6 lg:grid-cols-3">
        {tiers.map((tier, i) => (
          <Reveal key={tier.name} delay={i * 0.08} className="h-full">
            <div
              className={clsx(
                "flex h-full flex-col rounded-2xl border p-7",
                tier.featured
                  ? "border-primary bg-white shadow-lift ring-1 ring-primary"
                  : "border-border bg-white shadow-card",
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-ink">{tier.name}</h3>
                {tier.featured && (
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-white">
                    Most popular
                  </span>
                )}
              </div>
              <p className="mt-4 flex items-end gap-1">
                <span className="text-4xl font-semibold tracking-tight text-ink">
                  {tier.price}
                </span>
                {tier.period && (
                  <span className="pb-1 text-sm text-ink-muted">{tier.period}</span>
                )}
              </p>
              <p className="mt-2 text-sm text-ink-soft">{tier.blurb}</p>

              <ul className="mt-6 flex flex-1 flex-col gap-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-ink-soft">
                    <Icon
                      name="check"
                      className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                    />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                href="#cta"
                variant={tier.featured ? "primary" : "secondary"}
                size="lg"
                className="mt-8 w-full"
              >
                {tier.cta}
              </Button>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
