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
        subtitle="Power BI, Tableau and Looker are great at charts. InsightFlow adds the AI, automation and SME-friendly pricing they don't."
      />

      <div ref={root} className="mt-8 sm:mt-12 lg:mt-14">
        {/* Desktop / tablet table — horizontally scrollable with edge hint */}
        <div className="hidden sm:block -mx-4 sm:mx-0 overflow-x-auto pb-2 sm:pb-0 scrollbar-thin">
          <div className="min-w-[640px] px-4 sm:px-0">
            <table className="w-full overflow-hidden rounded-2xl border border-border bg-white text-left shadow-card">
              <thead>
                <tr data-head-row className="border-b border-border">
                  <th className="p-3 lg:p-4 text-sm font-medium text-ink-soft" scope="col">Feature</th>
                  {COMPARISON.columns.map((col, i) => (
                    <th
                      key={col}
                      className={clsx(
                        "p-3 lg:p-4 text-sm font-semibold whitespace-nowrap",
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
                    <td className="p-3 lg:p-4 text-sm font-medium text-ink">{row.feature}</td>
                    {row.cells.map((cell, i) => (
                      <td
                        key={i}
                        className={clsx(
                          "p-3 lg:p-4 text-sm",
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
        </div>

        {/* Mobile cards — no horizontal scroll, clean stacked comparison */}
        <div className="grid gap-3 sm:hidden">
          {COMPARISON.rows.map((row) => (
            <div key={row.feature} data-row className="rounded-2xl border border-border bg-white p-4 shadow-card">
              <h3 className="text-sm font-semibold text-ink">{row.feature}</h3>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {row.cells.map((cell, i) => {
                  const isFlow = i === lastCol;
                  return (
                    <div
                      key={i}
                      className={clsx(
                        "rounded-xl px-3 py-2.5 text-xs leading-tight",
                        isFlow
                          ? "bg-primary-50 border border-primary/20 text-ink font-medium col-span-2 sm:col-span-1"
                          : "bg-bg-soft border border-border text-ink-soft",
                      )}
                    >
                      <p className="text-[10px] uppercase tracking-wide opacity-70 mb-1 font-medium">
                        {COMPARISON.columns[i]}
                      </p>
                      <p className={clsx("flex items-center gap-1.5", isFlow && "text-primary")}>
                        {isFlow && <Icon name="check" className="h-3.5 w-3.5 text-accent shrink-0" />}
                        <span>{cell}</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}