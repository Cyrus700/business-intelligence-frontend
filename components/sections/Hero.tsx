"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { EASE, prefersReducedMotion } from "@/lib/motion";
import { useLandingData } from "@/lib/landing-api";
import { HERO } from "@/lib/content";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import DashboardMock from "@/components/ui/DashboardMock";

export default function Hero() {
  const root = useRef<HTMLDivElement>(null);
  const { data } = useLandingData();
  const hero = data?.hero ?? HERO;

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const items = q("[data-anim]");

      if (prefersReducedMotion()) {
        gsap.set(items, { opacity: 1, y: 0 });
        return;
      }

      gsap.from(items, {
        y: 20,
        opacity: 0,
        duration: 0.6,
        ease: EASE.out,
        stagger: 0.08,
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28">
      <div className="hero-wash pointer-events-none absolute inset-0 -z-10" />

      <div className="container-page grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col items-start gap-6">
          <span
            data-anim
            className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3.5 py-1.5 text-xs font-medium text-ink-soft"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {hero.eyebrow}
          </span>

          <h1
            data-anim
            className="text-4xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-5xl lg:text-6xl"
          >
            {hero.title.map((line, i) => (
              <span key={i} className="block">
                {line}
              </span>
            ))}
          </h1>

          <p data-anim className="max-w-xl text-lg leading-relaxed text-ink-soft">
            {hero.subtitle}
          </p>

          <div data-anim className="flex flex-col gap-3 sm:flex-row">
            <Button href="/signup" variant="primary" size="lg">
              {hero.primaryCta}
              <Icon name="arrow" className="h-4 w-4" />
            </Button>
            <Button href="#how" variant="secondary" size="lg">
              {hero.secondaryCta}
            </Button>
          </div>
        </div>

        <div data-anim className="w-full">
          <DashboardMock className="shadow-lift" />
        </div>
      </div>
    </section>
  );
}
