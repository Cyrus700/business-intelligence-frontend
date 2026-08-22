"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Icon from "@/components/ui/Icon";
import { DUR, EASE, prefersReducedMotion, revealTrigger } from "@/lib/motion";
import { COMPARISON } from "@/lib/content";
import { clsx } from "@/lib/cx";

export default function Comparison() {
  const lastCol = COMPARISON.columns.length - 1;
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el || prefersReducedMotion()) return;
      const q = gsap.utils.selector(root);

      // Header row, then body rows cascade in.
      gsap.from(q("[data-head-row]"), {
        y: 10,
        opacity: 0,
        duration: DUR.fast,
        ease: EASE.out,
        scrollTrigger: revealTrigger(el),
      });
      gsap.from(q("[data-row]"), {
        opacity: 0,
        y: 14,
        duration: DUR.base,
        ease: EASE.out,
        stagger: 0.07,
        delay: 0.15,
        scrollTrigger: revealTrigger(el),
      });

      // The "us" column checks pop crisply after the rows land.
      gsap.from(q("[data-check]"), {
        scale: 0.4,
        opacity: 0,
        duration: DUR.fast,
        ease: EASE.pop,
        stagger: 0.08,
        delay: 0.5,
        scrollTrigger: revealTrigger(el),
      });
    },
    { scope: root },
  );

  return (
    <Section id="compare" soft>
      <SectionHeading
        eyebrow="How we compare"
        title={
          <>
            Built for what other tools{" "}
            <span className="text-gradient">leave out</span>
          </>
        }
        subtitle="Power BI, Tableau and Looker are great at charts. Insightful adds the AI, automation and SME-friendly pricing they don't."
      />

      <div ref={root} data-reveal className="mt-14 overflow-x-auto">
        <table className="w-full min-w-[640px] overflow-hidden rounded-2xl border border-border bg-white text-left shadow-card">
          <thead>
            <tr data-head-row className="border-b border-border">
              <th className="p-4 text-sm font-medium text-ink-soft" scope="col">Feature</th>
              {COMPARISON.columns.map((col, i) => (
                <th
                  key={col}
                  className={clsx(
                    "p-4 text-sm font-semibold",
                    i === lastCol ? "bg-primary-50 text-primary" : "text-ink",
                  )}
                 scope="col">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARISON.rows.map((row) => (
              <tr key={row.feature} data-row className="border-b border-border last:border-0">
                <td className="p-4 text-sm font-medium text-ink">{row.feature}</td>
                {row.cells.map((cell, i) => (
                  <td
                    key={i}
                    className={clsx(
                      "p-4 text-sm",
                      i === lastCol
                        ? "bg-primary-50 font-semibold text-ink"
                        : "text-ink-soft",
                    )}
                  >
                    {i === lastCol ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span data-check className="grid place-items-center">
                          <Icon name="check" className="h-4 w-4 text-accent" />
                        </span>
                        {cell}
                      </span>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}