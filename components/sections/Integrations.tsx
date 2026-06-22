"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { EASE, prefersReducedMotion } from "@/lib/motion";
import { INTEGRATIONS } from "@/lib/content";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Icon from "@/components/ui/Icon";

export default function Integrations() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from("[data-chip]", {
        scale: 0.6,
        opacity: 0,
        duration: 0.6,
        ease: EASE.pop,
        stagger: 0.08,
        scrollTrigger: { trigger: root.current, start: "top 75%", once: true },
      });
      gsap.from("[data-hub]", {
        scale: 0.7,
        opacity: 0,
        duration: 0.7,
        ease: EASE.pop,
        scrollTrigger: { trigger: root.current, start: "top 75%", once: true },
      });
    },
    { scope: root },
  );

  return (
    <section className="bg-bg-soft py-24 md:py-32">
      <Container>
        <SectionHeading
          eyebrow="Integrations"
          title="Bring every source together"
          subtitle="Files, databases and APIs flow through our ETL pipelines into one trusted warehouse — your single source of truth."
        />

        <div
          ref={root}
          className="mt-16 flex flex-wrap items-center justify-center gap-3"
        >
          {INTEGRATIONS.slice(0, 3).map((s) => (
            <span
              key={s}
              data-chip
              className="rounded-full border border-border bg-white px-5 py-2.5 text-sm font-medium text-ink shadow-card"
            >
              {s}
            </span>
          ))}

          <span data-hub className="mx-2 hidden sm:inline-flex">
            <Icon name="arrow" className="h-5 w-5 text-ink-muted" />
          </span>

          <span
            data-hub
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3.5 font-semibold text-white shadow-lift"
          >
            <Icon name="pipe" className="h-5 w-5" /> Insightful warehouse
          </span>

          <span data-hub className="mx-2 hidden sm:inline-flex">
            <Icon name="arrow" className="h-5 w-5 text-ink-muted" />
          </span>

          {INTEGRATIONS.slice(3).map((s) => (
            <span
              key={s}
              data-chip
              className="rounded-full border border-border bg-white px-5 py-2.5 text-sm font-medium text-ink shadow-card"
            >
              {s}
            </span>
          ))}
        </div>
      </Container>
    </section>
  );
}
