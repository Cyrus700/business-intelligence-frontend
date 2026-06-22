"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { clsx } from "@/lib/cx";
import { prefersReducedMotion } from "@/lib/motion";
import { STEPS } from "@/lib/content";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Icon from "@/components/ui/Icon";

function StepVisual({ index, active }: { index: number; active: boolean }) {
  return (
    <div
      data-visual={index}
      className={clsx(
        "absolute inset-0 flex items-center justify-center transition-opacity",
        active ? "opacity-100" : "opacity-0",
      )}
    >
      {index === 0 && (
        <div className="w-full max-w-sm space-y-3">
          {["CSV / Excel", "PostgreSQL", "REST APIs"].map((s, i) => (
            <div
              key={s}
              className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 shadow-card"
              style={{ marginLeft: `${i * 18}px` }}
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-50 text-primary">
                <Icon name="pipe" className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium text-ink">{s}</span>
              <span className="ml-auto h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            </div>
          ))}
          <p className="pt-2 text-center text-xs text-ink-muted">
            → unified into one warehouse
          </p>
        </div>
      )}

      {index === 1 && (
        <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-5 shadow-card">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-white">
              <Icon name="spark" className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold text-ink">AI engine running</span>
          </div>
          <div className="mt-4 flex h-24 items-end gap-1.5">
            {[40, 60, 50, 78, 64, 90, 72].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-gradient-to-t from-primary/60 to-primary"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="mt-3 flex gap-2 text-[11px]">
            <span className="rounded-full bg-accent-50 px-2 py-1 font-medium text-accent">
              Forecast ready
            </span>
            <span className="rounded-full bg-warn-50 px-2 py-1 font-medium text-warn">
              1 anomaly
            </span>
          </div>
        </div>
      )}

      {index === 2 && (
        <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Recommendation
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink">
            Restock Region B by <span className="font-semibold">+18%</span> before
            Friday — demand is forecast to exceed current inventory.
          </p>
          <div className="mt-4 flex gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white">
              <Icon name="check" className="h-3.5 w-3.5" /> Apply
            </span>
            <span className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink-soft">
              View detail
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HowItWorks() {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const steps = gsap.utils.toArray<HTMLElement>("[data-step]", root.current);
      steps.forEach((step, i) => {
        gsap.from(step, {
          opacity: 0,
          y: 30,
          duration: 0.6,
          scrollTrigger: { trigger: step, start: "top 80%", once: true },
        });
        // Drive the sticky visual as each step crosses the viewport centre.
        gsap.timeline({
          scrollTrigger: {
            trigger: step,
            start: "top 55%",
            end: "bottom 55%",
            onToggle: (self) => self.isActive && setActive(i),
          },
        });
      });
    },
    { scope: root },
  );

  return (
    <section id="how" className="scroll-mt-24 bg-bg-soft py-24 md:py-32">
      <Container>
        <SectionHeading
          eyebrow="How it works"
          title="Three steps from data to decision"
          subtitle="No data team, no months-long rollout. Connect your data and let the platform do the heavy lifting."
        />

        <div ref={root} className="mt-16 grid gap-12 lg:grid-cols-2">
          {/* Scrolling steps */}
          <ol className="flex flex-col">
            {STEPS.map((step, i) => (
              <li
                key={step.no}
                data-step
                className="flex min-h-[55vh] flex-col justify-center gap-4 lg:min-h-[70vh]"
              >
                <div className="flex items-center gap-4">
                  <span
                    className={clsx(
                      "grid h-12 w-12 shrink-0 place-items-center rounded-xl font-mono text-lg font-semibold transition-colors",
                      active === i
                        ? "bg-primary text-white"
                        : "bg-white text-ink-muted ring-1 ring-border",
                    )}
                  >
                    {step.no}
                  </span>
                  <h3 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">
                    {step.title}
                  </h3>
                </div>
                <p className="max-w-md text-lg leading-relaxed text-ink-soft">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>

          {/* Sticky visual */}
          <div className="hidden lg:block">
            <div className="sticky top-28 flex h-[420px] items-center justify-center">
              <div className="mesh-glow absolute inset-0 -z-10 rounded-3xl opacity-60" />
              <div className="relative h-full w-full rounded-3xl border border-border bg-white/40 p-8 backdrop-blur-sm">
                <div className="relative h-full w-full">
                  {STEPS.map((_, i) => (
                    <StepVisual key={i} index={i} active={active === i} />
                  ))}
                </div>
                {/* progress rail */}
                <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
                  {STEPS.map((_, i) => (
                    <span
                      key={i}
                      className={clsx(
                        "h-1.5 rounded-full transition-all duration-300",
                        active === i ? "w-8 bg-primary" : "w-1.5 bg-border",
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
