"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { EASE, prefersReducedMotion } from "@/lib/motion";
import { clsx } from "@/lib/cx";
import { useLandingData } from "@/lib/landing-api";
import { PRICING } from "@/lib/content";

export default function Pricing() {
  const root = useRef<HTMLDivElement>(null);
  const { data } = useLandingData();
  const tiers = data?.pricing ?? PRICING;

  useGSAP(
    () => {
      if (prefersReducedMotion() || !root.current) return;
      const q = gsap.utils.selector(root);

      // Recommended plan keeps a slow, subtle glow.
      gsap.fromTo(
        q("[data-glow]"),
        { opacity: 0.15 },
        {
          opacity: 0.5,
          duration: 2.4,
          ease: EASE.ambient,
          yoyo: true,
          repeat: -1,
          delay: 0.8,
        },
      );
    },
    { scope: root },
  );

  return (
    <Section id="pricing" soft>
      <SectionHeading
        eyebrow="Pricing"
        title={
          <>
            Priced for SMEs, <span className="text-gradient">ready for scale</span>
          </>
        }
        subtitle="Start free, pay only for what you use, and upgrade when you grow. No upfront hardware, no enterprise lock-in."
      />

      <div ref={root} className="mt-16 grid items-stretch gap-6 lg:grid-cols-3">
        {tiers.map((tier, i) => (
          <Reveal key={tier.name} y={36} scale={0.95} delay={i * 0.1} className="h-full">
            <div
              className={clsx(
                "relative flex h-full flex-col rounded-2xl border p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift",
                tier.featured
                  ? "border-primary bg-white ring-1 ring-primary"
                  : "border-border bg-white shadow-card hover:border-primary/30",
                !tier.featured && "hover:shadow-lift",
              )}
            >
              {tier.featured && (
                <span
                  data-glow
                  aria-hidden
                  className="pointer-events-none absolute -inset-px rounded-2xl shadow-[0_0_0_1px_var(--color-primary),0_24px_48px_-16px_rgba(79,70,229,0.35)]"
                />
              )}
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