"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { clsx } from "@/lib/cx";
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
      const panels = gsap.utils.toArray<HTMLElement>("[data-panel]", root.current);
      panels.forEach((panel, i) => {
        gsap.to(panel, {
          height: open === i ? "auto" : 0,
          opacity: open === i ? 1 : 0,
          duration: 0.4,
          ease: "power2.inOut",
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
          title="Questions, answered"
          subtitle="The things teams ask us most before getting started."
        />

        <div ref={root} className="mt-12 flex flex-col gap-3">
          {items.map((item, i) => {
            const isOpen = open === i;
            return (
              <div
                key={item.q}
                className={clsx(
                  "overflow-hidden rounded-2xl border bg-white transition-colors",
                  isOpen ? "border-primary/30 shadow-card" : "border-border",
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left"
                >
                  <span className="font-medium text-ink">{item.q}</span>
                  <span
                    className={clsx(
                      "grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border text-ink-soft transition-transform duration-300",
                      isOpen && "rotate-45 border-primary text-primary",
                    )}
                  >
                    +
                  </span>
                </button>
                <div data-panel className="h-0 opacity-0">
                  <p className="px-5 pb-5 text-sm leading-relaxed text-ink-soft">
                    {item.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
