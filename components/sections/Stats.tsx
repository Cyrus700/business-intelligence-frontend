"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { EASE, prefersReducedMotion } from "@/lib/motion";
import { STATS } from "@/lib/content";

export default function Stats() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const nodes = gsap.utils.toArray<HTMLElement>("[data-counter]", root.current);
      nodes.forEach((node) => {
        const to = Number(node.dataset.to);
        const decimals = Number(node.dataset.decimals ?? 0);
        const format = (v: number) => v.toFixed(decimals);

        if (prefersReducedMotion()) {
          node.textContent = format(to);
          return;
        }

        const obj = { v: 0 };
        node.textContent = format(0);
        gsap.to(obj, {
          v: to,
          duration: 1.6,
          ease: EASE.out,
          scrollTrigger: { trigger: node, start: "top 85%", once: true },
          onUpdate: () => {
            node.textContent = format(obj.v);
          },
        });
      });
    },
    { scope: root },
  );

  return (
    <section className="py-20 md:py-24">
      <div ref={root} className="container-page">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-card lg:grid-cols-4">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="flex flex-col items-center gap-1.5 bg-white px-6 py-10 text-center"
            >
              <p className="font-mono text-4xl font-semibold tracking-tight text-primary md:text-5xl">
                {s.prefix ?? ""}
                <span data-counter data-to={s.value} data-decimals={s.value % 1 !== 0 ? 1 : 0}>
                  {s.value}
                </span>
                {s.suffix}
              </p>
              <p className="text-sm text-ink-soft">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
