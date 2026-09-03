"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Icon from "@/components/ui/Icon";
import { DUR, EASE, pointerSpotlight, prefersReducedMotion, tilt } from "@/lib/motion";
import { useLandingData } from "@/lib/landing-api";
import { FEATURES } from "@/lib/content";

type IconName = "chart" | "trend" | "alert" | "spark" | "pipe" | "lock";

// Feature cards explain what the product does. They used to carry a live
// counter each ("3,420 KPI points secured"), which read as noise next to the
// copy — the platform figures now live in one place, the stats band.

export default function Features() {
  const root = useRef<HTMLDivElement>(null);
  const { data } = useLandingData();
  const features = data?.features ?? FEATURES;

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const cards = gsap.utils.toArray<HTMLElement>("[data-feature]", el);
      const icons = gsap.utils.toArray<HTMLElement>("[data-feature-icon]", el);
      const cleanups: Array<() => void> = [];

      if (prefersReducedMotion()) {
        gsap.set(cards, { opacity: 1, y: 0, scale: 1, rotationX: 0, clearProps: "transform,opacity" });
        gsap.set(icons, { opacity: 1, scale: 1, rotation: 0, clearProps: "transform,opacity" });
        return;
      }

      // Premium landing choreography: cards lift with subtle 3D, icons pop
      // with a crisp back-ease — feels engineered, not just faded in.
      gsap.from(cards, {
        y: 46,
        opacity: 0,
        scale: 0.93,
        rotationX: 8,
        transformPerspective: 900,
        duration: 0.85,
        ease: EASE.expo,
        stagger: { each: 0.09, grid: "auto", from: "start" },
        scrollTrigger: { trigger: el, start: "top 82%", once: true },
      });

      gsap.from(icons, {
        scale: 0.35,
        opacity: 0,
        rotation: -18,
        duration: 0.65,
        ease: EASE.pop,
        stagger: { each: 0.08, grid: "auto", from: "start" },
        delay: 0.18,
        scrollTrigger: { trigger: el, start: "top 82%", once: true },
      });

      // Hover polish: spotlight + subtle 3D tilt on desktop.
      cards.forEach((card) => {
        cleanups.push(pointerSpotlight(card));
        if (window.innerWidth >= 1024) cleanups.push(tilt(card as HTMLElement, 3));
      });

      // Phone fallback: if ScrollTrigger never fires (element already in
      // viewport, throttled JS, or user scrolls past), force visible after
      // the stagger should have finished. Fixes the white-space where 4/6
      // cards stay at opacity:0.
      const fallback = window.setTimeout(() => {
        gsap.set(cards, { opacity: 1, y: 0, scale: 1, rotationX: 0, clearProps: "transform,opacity" });
        gsap.set(icons, { opacity: 1, scale: 1, rotation: 0, clearProps: "transform,opacity" });
      }, 1850);
      cleanups.push(() => window.clearTimeout(fallback));

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
        subtitle="From raw data to a recommended next step — InsightFlow covers every stage, so your team never leaves the dashboard."
      />

      <div ref={root} className="mt-8 sm:mt-12 lg:mt-16 grid gap-4 sm:gap-5 lg:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => {
          return (
            <article
              key={f.title}
              data-feature
              className="surface-spotlight group flex h-full flex-col rounded-xl sm:rounded-2xl border border-border bg-white p-5 sm:p-6 lg:p-7 shadow-card transition-all duration-300 lg:hover:-translate-y-1 hover:border-primary/30 lg:hover:shadow-lift"
            >
              <span
                data-feature-icon
                className="grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-xl bg-primary-50 text-primary transition-all duration-300 group-hover:-rotate-2 sm:group-hover:-rotate-3 group-hover:scale-105 sm:group-hover:scale-110 group-hover:bg-primary group-hover:text-white will-change-transform"
              >
                <Icon name={f.icon as IconName} className="h-5 w-5 sm:h-6 sm:w-6" />
              </span>
              <h3 className="mt-4 sm:mt-5 text-base sm:text-lg font-semibold text-ink leading-tight">{f.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">
                {f.body}
              </p>
            </article>
          );
        })}
      </div>
    </Section>
  );
}
