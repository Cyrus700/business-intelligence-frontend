"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { EASE, prefersReducedMotion } from "@/lib/motion";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import DashboardMock from "@/components/ui/DashboardMock";
import Icon from "@/components/ui/Icon";

export default function DashboardPreview() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduce = prefersReducedMotion();
      const q = gsap.utils.selector(root);

      // Draw-on line chart
      const line = root.current?.querySelector<SVGPathElement>(".mock-line");
      if (line) {
        const len = line.getTotalLength();
        gsap.set(line, { strokeDasharray: len });
        if (reduce) {
          gsap.set(line, { strokeDashoffset: 0 });
        } else {
          gsap.fromTo(
            line,
            { strokeDashoffset: len },
            {
              strokeDashoffset: 0,
              duration: 1.4,
              ease: EASE.out,
              scrollTrigger: { trigger: root.current, start: "top 70%", once: true },
            },
          );
        }
      }

      if (reduce) return;

      // Bars grow
      gsap.from(q(".mock-bar"), {
        scaleY: 0,
        transformOrigin: "bottom",
        duration: 0.7,
        stagger: 0.05,
        ease: EASE.out,
        scrollTrigger: { trigger: root.current, start: "top 70%", once: true },
      });

      // KPI count-up
      gsap.utils.toArray<HTMLElement>("[data-kpi]", root.current).forEach((node) => {
        const to = Number(node.dataset.kpiTo);
        const decimals = Number(node.dataset.kpiDecimals ?? 0);
        const obj = { v: 0 };
        gsap.to(obj, {
          v: to,
          duration: 1.4,
          ease: EASE.out,
          scrollTrigger: { trigger: node, start: "top 85%", once: true },
          onUpdate: () => (node.textContent = obj.v.toFixed(decimals)),
        });
      });

      // Parallax: floating chips drift at different speeds
      q("[data-depth]").forEach((el) => {
        const depth = Number((el as HTMLElement).dataset.depth);
        gsap.to(el, {
          yPercent: depth * -10,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        });
      });
    },
    { scope: root },
  );

  return (
    <section className="overflow-hidden py-24 md:py-32">
      <Container>
        <SectionHeading
          eyebrow="See it live"
          title="A dashboard that reads like a conversation"
          subtitle="Live KPIs, forecasts that draw themselves, and anomalies that raise their hand — all in a layout designed for non-technical users."
        />

        <div ref={root} className="relative mt-16">
          <div className="mesh-glow pointer-events-none absolute inset-0 -z-10 scale-110 opacity-70" />

          <div className="mx-auto max-w-2xl">
            <DashboardMock className="shadow-lift" />
          </div>

          {/* Floating accent chips with parallax */}
          <div
            data-depth="2"
            className="absolute -left-2 top-10 hidden rounded-xl border border-border bg-white px-4 py-3 shadow-card sm:block lg:left-10"
          >
            <p className="text-[11px] text-ink-muted">Forecast accuracy</p>
            <p className="font-mono text-lg font-semibold text-accent">+27%</p>
          </div>

          <div
            data-depth="3"
            className="absolute -right-2 bottom-6 hidden items-center gap-2 rounded-xl border border-border bg-white px-4 py-3 shadow-card sm:flex lg:right-10"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-50 text-accent">
              <Icon name="check" className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[11px] text-ink-muted">Reports automated</p>
              <p className="font-mono text-sm font-semibold text-ink">100%</p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
