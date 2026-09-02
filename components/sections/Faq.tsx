"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { clsx } from "@/lib/cx";
import { DUR, EASE, prefersReducedMotion } from "@/lib/motion";
import { useLandingData } from "@/lib/landing-api";
import { FAQS } from "@/lib/content";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";

export default function Faq() {
  const { data } = useLandingData();
  const items = data?.faqs ?? FAQS;
  const [open, setOpen] = useState<number | null>(0);
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const panels = gsap.utils.toArray<HTMLElement>("[data-panel]", root.current);
      const reduce = prefersReducedMotion();

      panels.forEach((panel, i) => {
        const isOpen = open === i;
        const body = panel.querySelector<HTMLElement>("[data-panel-body]");

        if (reduce) {
          gsap.set(panel, { height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 });
          return;
        }

        gsap.to(panel, {
          height: isOpen ? "auto" : 0,
          opacity: isOpen ? 1 : 0,
          duration: DUR.fast,
          ease: EASE.inOut,
        });
        if (body) {
          gsap.to(body, {
            y: isOpen ? 0 : -8,
            opacity: isOpen ? 1 : 0,
            duration: DUR.quick,
            ease: EASE.out,
            delay: isOpen ? 0.1 : 0,
            immediateRender: false,
          });
        }
        gsap.to(q("[data-faq-icon]")[i], {
          rotation: isOpen ? 45 : 0,
          duration: DUR.quick,
          ease: EASE.inOut,
          immediateRender: false,
        });
      });
    },
    { scope: root, dependencies: [open] },
  );

  return (
    <Section soft>
      <div className="mx-auto max-w-3xl">
        <SectionHeading
          eyebrow="FAQ"
          title={
            <>
              Questions, <span className="text-gradient">answered</span>
            </>
          }
          subtitle="The things teams ask us most before getting started."
        />

        <div ref={root} className="mt-8 sm:mt-12 flex flex-col gap-3">
          {items.map((item, i) => {
            const isOpen = open === i;
            return (
              <div
                key={item.q}
                className={clsx(
                  "overflow-hidden rounded-xl sm:rounded-2xl border bg-white transition-colors duration-300",
                  isOpen ? "border-primary/30 shadow-card" : "border-border",
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-3 sm:gap-4 p-4 sm:p-5 text-left"
                >
                  <span className="text-[15px] sm:text-base font-medium text-ink leading-snug pr-2">{item.q}</span>
                  <span
                    data-faq-icon
                    className={clsx(
                      "grid h-7 w-7 sm:h-7 sm:w-7 shrink-0 place-items-center rounded-full border text-ink-soft text-sm leading-none",
                      isOpen ? "border-primary text-primary bg-primary-50" : "border-border bg-white",
                    )}
                  >
                    +
                  </span>
                </button>
                <div data-panel className="h-0 opacity-0 overflow-hidden">
                  <div data-panel-body className="px-4 sm:px-5 pb-4 sm:pb-5">
                    <p className="text-sm leading-relaxed text-ink-soft">
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}