"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import Icon from "@/components/ui/Icon";
import { DUR, EASE, prefersReducedMotion, revealTrigger } from "@/lib/motion";
import { SECURITY } from "@/lib/content";

export default function Security() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el || prefersReducedMotion()) return;
      const q = gsap.utils.selector(root);

      // Protocol chips pop in with a crisp, trustworthy bounce.
      gsap.from(q("[data-badge]"), {
        scale: 0.6,
        opacity: 0,
        duration: DUR.fast,
        ease: EASE.pop,
        stagger: 0.07,
        scrollTrigger: revealTrigger(el),
      });

      // Card icons land slightly later with the same pop feel.
      gsap.from(q("[data-sec-icon]"), {
        scale: 0.5,
        opacity: 0,
        duration: DUR.fast,
        ease: EASE.pop,
        stagger: 0.1,
        delay: 0.15,
        scrollTrigger: revealTrigger(el),
      });
    },
    { scope: root },
  );

  return (
    <Section id="security">
      <div ref={root} className="grid items-start lg:items-center gap-8 sm:gap-10 lg:gap-12 xl:gap-14 lg:grid-cols-2">
        <div className="min-w-0">
          <SectionHeading
            center={false}
            eyebrow="Security & governance"
            title={
              <>
                Enterprise-grade security,{" "}
                <span className="text-gradient">by default</span>
              </>
            }
            subtitle="Sensitive business data deserves more than good intentions. InsightFlow bakes protection into every layer of the stack."
          />
          <Reveal delay={0.1}>
            <div className="mt-6 sm:mt-8 flex flex-wrap gap-2">
              {["TLS 1.3", "AES-256", "JWT", "RBAC", "RLS"].map((t) => (
                <span
                  key={t}
                  data-badge
                  className="rounded-full border border-border bg-bg-soft px-3 py-1.5 font-mono text-xs font-medium text-ink-soft transition-all duration-300 lg:hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary"
                >
                  {t}
                </span>
              ))}
            </div>
          </Reveal>
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
          {SECURITY.map((s, i) => (
            <Reveal key={s.title} delay={(i % 2) * 0.1} className="h-full">
              <div className="flex h-full flex-col gap-2 rounded-xl sm:rounded-2xl border border-border bg-white p-5 shadow-card transition-all duration-300 lg:hover:-translate-y-0.5 hover:border-accent/40 lg:hover:shadow-lift">
                <span
                  data-sec-icon
                  className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-lg bg-accent-50 text-accent shrink-0"
                >
                  <Icon name="lock" className="h-5 w-5" />
                </span>
                <h3 className="mt-1 text-sm sm:text-base font-semibold text-ink leading-tight">{s.title}</h3>
                <p className="text-sm leading-relaxed text-ink-soft">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}