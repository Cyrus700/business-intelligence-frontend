"use client";

import { useState } from "react";
import { clsx } from "@/lib/cx";
import { CTA } from "@/lib/content";
import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import Icon from "@/components/ui/Icon";

export default function CtaNewsletter() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <section id="cta" className="scroll-mt-24 py-24 md:py-32">
      <Container>
        <div className="relative overflow-hidden rounded-3xl border border-border bg-ink px-6 py-16 text-center md:py-20">
          <div className="mesh-glow pointer-events-none absolute inset-0 opacity-90" />
          <div className="dot-grid pointer-events-none absolute inset-0 opacity-30" />

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
                  className="h-12 flex-1 rounded-full border border-white/15 bg-white/10 px-5 text-sm text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none"
                />
                <button
                  type="submit"
                  className={clsx(
                    "inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-sm font-medium transition-all active:scale-[0.98]",
                    submitted
                      ? "bg-accent text-white"
                      : "bg-white text-ink hover:-translate-y-0.5",
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
          </div>
        </div>
      </Container>
    </section>
  );
}
