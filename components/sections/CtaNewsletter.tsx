"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { clsx } from "@/lib/cx";
import { EASE, prefersReducedMotion } from "@/lib/motion";
import { CTA } from "@/lib/content";
import { useLandingLive } from "@/lib/landing-api";
import Skeleton from "@/components/ui/Skeleton";
import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import Icon from "@/components/ui/Icon";

export default function CtaNewsletter() {
  const [submitted, setSubmitted] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const { data: live, loading } = useLandingLive();

  useGSAP(
    () => {
      if (prefersReducedMotion() || !root.current) return;
      const q = gsap.utils.selector(root);

      // Slow ambient drift on the dot field + glow blooms.
      gsap.to(q("[data-drift]"), {
        xPercent: 4,
        yPercent: -3,
        duration: 8,
        ease: EASE.ambient,
        yoyo: true,
        repeat: -1,
      });
      gsap.to(q("[data-glow-a]"), {
        scale: 1.15,
        opacity: 0.85,
        duration: 6,
        ease: EASE.ambient,
        yoyo: true,
        repeat: -1,
        delay: 0.5,
      });
      gsap.to(q("[data-glow-b]"), {
        scale: 1.2,
        opacity: 0.7,
        duration: 7,
        ease: EASE.ambient,
        yoyo: true,
        repeat: -1,
      });
    },
    { scope: root },
  );

  return (
    <section id="cta" className="scroll-mt-24 py-24 md:py-32">
      <Container>
        <div
          ref={root}
          className="relative overflow-hidden rounded-3xl bg-ink px-6 py-16 text-center md:py-20"
        >
          {/* Ambient background: drifting dot field + breathing brand glows. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              data-drift
              className="dot-grid-light absolute inset-[-10%] will-change-transform"
            />
            <div
              data-glow-a
              className="absolute -top-1/3 left-[15%] h-[420px] w-[420px] rounded-full bg-primary/30 blur-[110px] will-change-transform"
            />
            <div
              data-glow-b
              className="absolute -bottom-1/3 right-[10%] h-[380px] w-[380px] rounded-full bg-accent/25 blur-[100px] will-change-transform"
            />
          </div>

          <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-6">
            <Reveal>
              <h2 className="text-balance text-3xl font-semibold tracking-tight text-white md:text-5xl">
                {CTA.title}
              </h2>
            </Reveal>
            <Reveal delay={0.05}>
              <p className="text-balance text-lg leading-relaxed text-white/70">
                {CTA.subtitle}
              </p>
            </Reveal>

            <Reveal delay={0.1} className="w-full">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSubmitted(true);
                }}
                className="mx-auto flex w-full max-w-md flex-col gap-3 sm:flex-row"
              >
                <input
                  type="email"
                  required
                  placeholder={CTA.newsletterPlaceholder}
                  aria-label="Email address"
                  className="h-12 flex-1 rounded-full border border-white/15 bg-white/10 px-5 text-sm text-white transition-all duration-300 placeholder:text-white/50 hover:bg-white/15 focus:border-white/50 focus:bg-white/15 focus:shadow-[0_0_0_4px_rgba(255,255,255,0.12)] focus:outline-none"
                />
                <button
                  type="submit"
                  className={clsx(
                    "inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-sm font-medium transition-all duration-300 active:scale-[0.98]",
                    submitted
                      ? "bg-accent text-white shadow-[var(--shadow-lift)]"
                      : "bg-white text-ink hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-12px_rgba(16,185,129,0.35)]",
                  )}
                >
                  {submitted ? (
                    <>
                      <Icon name="check" className="h-4 w-4" /> You&apos;re in
                    </>
                  ) : (
                    <>
                      {CTA.cta}
                      <Icon name="arrow" className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </Reveal>
            <p className="text-xs text-white/50">
              Free to start · No credit card required
            </p>

            {/* Close on the real scale of what is already running. */}
            {live ? (
              <dl className="mt-6 grid w-full grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 text-center">
                {[
                  {
                    v: live.totals.records_unified.toLocaleString("en-IN"),
                    l: "rows unified",
                  },
                  {
                    v: `${live.pipeline.success_rate_pct}%`,
                    l: "ETL success rate",
                  },
                  {
                    v: `${live.totals.data_sources}`,
                    l: "data sources connected",
                  },
                ].map((s) => (
                  <div key={s.l} className="bg-ink/60 px-3 py-4 backdrop-blur">
                    <dt className="font-mono text-lg font-semibold tabular-nums text-white">
                      {s.v}
                    </dt>
                    <dd className="mt-0.5 text-[11px] text-white/55">{s.l}</dd>
                  </div>
                ))}
              </dl>
            ) : loading ? (
              <div className="mt-6 grid w-full grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 text-center">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="bg-ink/60 px-3 py-4 backdrop-blur">
                    <Skeleton className="mx-auto h-5 w-16" />
                    <Skeleton className="mx-auto mt-2 h-3 w-24" />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </Container>
    </section>
  );
}