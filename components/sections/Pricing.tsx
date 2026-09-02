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

      <div ref={root} className="mt-8 sm:mt-12 lg:mt-16 grid items-stretch gap-4 sm:gap-5 lg:gap-6 lg:grid-cols-3 max-w-5xl mx-auto lg:max-w-none">
        {tiers.map((tier, i) => (
          <Reveal key={tier.name} y={28} scale={0.98} delay={i * 0.07} className="h-full">
            <div
              className={clsx(
                "relative flex h-full flex-col rounded-xl sm:rounded-2xl border p-5 sm:p-6 lg:p-7 transition-all duration-300 lg:hover:-translate-y-1 lg:hover:shadow-lift",
                tier.featured
                  ? "border-primary bg-white shadow-card ring-1 ring-primary"
                  : "border-border bg-white shadow-card hover:border-primary/20",
                !tier.featured && "lg:hover:shadow-lift",
              )}
            >
              {tier.featured && (
                <span
                  data-glow
                  aria-hidden
                  className="pointer-events-none absolute -inset-px rounded-xl sm:rounded-2xl shadow-[0_0_0_1px_var(--color-primary),0_20px_40px_-16px_rgba(79,70,229,0.28)] hidden sm:block"
                />
              )}
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base sm:text-lg font-semibold text-ink leading-tight">{tier.name}</h3>
                {tier.featured && (
                  <span className="shrink-0 rounded-full bg-primary px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-medium text-white whitespace-nowrap">
                    Most popular
                  </span>
                )}
              </div>
              <p className="mt-3 sm:mt-4 flex items-baseline gap-1 flex-wrap">
                <span className="text-3xl sm:text-4xl font-semibold tracking-tight text-ink leading-none">
                  {tier.price}
                </span>
                {tier.period && (
                  <span className="text-sm text-ink-muted">{tier.period}</span>
                )}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{tier.blurb}</p>

              <ul className="mt-5 sm:mt-6 flex flex-1 flex-col gap-2.5 sm:gap-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm leading-relaxed text-ink-soft">
                    <Icon
                      name="check"
                      className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                    />
                    <span className="min-w-0">{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                href="#cta"
                variant={tier.featured ? "primary" : "secondary"}
                size="lg"
                className="mt-6 sm:mt-8 w-full justify-center"
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