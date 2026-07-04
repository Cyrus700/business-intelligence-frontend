"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { EASE, prefersReducedMotion } from "@/lib/motion";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import DashboardMock from "@/components/ui/DashboardMock";

export default function DashboardPreview() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduce = prefersReducedMotion();
      const q = gsap.utils.selector(root);

      // Draw-on line chart — a small hint that the data is live.
      const line = root.current?.querySelector<SVGPathElement>(".mock-line");
      if (line) {
        const len = line.getTotalLength();
        gsap.set(line, { strokeDasharray: len });
        gsap.fromTo(
          line,
          { strokeDashoffset: reduce ? 0 : len },
          {
            strokeDashoffset: 0,
            duration: 1.2,
            ease: EASE.out,
            scrollTrigger: { trigger: root.current, start: "top 70%", once: true },
          },
        );
      }

      if (reduce) return;

      gsap.from(q(".mock-bar"), {
        scaleY: 0,
        transformOrigin: "bottom",
        duration: 0.6,
        stagger: 0.05,
        ease: EASE.out,
        scrollTrigger: { trigger: root.current, start: "top 70%", once: true },
      });
    },
    { scope: root },
  );

  return (
    <section className="py-24 md:py-32">
      <Container>
        <SectionHeading
          eyebrow="The dashboard"
          title="Built to be read at a glance"
          subtitle="Live KPIs, forecasts and anomaly alerts in one clear layout — designed for people who aren't data analysts."
        />

        <div ref={root} className="mx-auto mt-16 max-w-2xl">
          <DashboardMock className="shadow-lift" />
        </div>
      </Container>
    </section>
  );
}
