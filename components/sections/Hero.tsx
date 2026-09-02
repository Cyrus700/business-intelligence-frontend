"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  DUR,
  EASE,
  magnetic,
  pointerSpotlight,
  prefersReducedMotion,
  splitChars,
  tilt,
} from "@/lib/motion";
import { useLandingData, useLandingLive } from "@/lib/landing-api";
import { HERO } from "@/lib/content";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Skeleton from "@/components/ui/Skeleton";
import LiveDashboard from "@/components/ui/LiveDashboard";

export default function Hero() {
  const root = useRef<HTMLElement>(null);
  const { data } = useLandingData();
  const { data: live } = useLandingLive();
  const hero = data?.hero ?? HERO;

  // The three proof points under the CTAs — real platform-scale aggregates,
  // nothing business-critical (no revenue, orders or margins).
  const proof = [
    {
      value: live ? live.totals.records_unified.toLocaleString("en-IN") : null,
      label: "rows unified",
    },
    {
      value: live ? `${live.totals.data_sources}` : null,
      label: "data sources connected",
    },
    {
      value: live ? `${live.pipeline.success_rate_pct}%` : null,
      label: "ETL success rate",
    },
  ];

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const reduce = prefersReducedMotion();
      const cleanups: Array<() => void> = [];

      if (reduce) {
        gsap.set(
          q("[data-anim], [data-line], [data-mock], [data-eyebrow], [data-hero-sub], [data-hero-ctas], [data-proof]"),
          { opacity: 1, y: 0, x: 0, scale: 1, yPercent: 0 },
        );
        return;
      }

      // Master timeline: everything above the fold lands in one choreography
      // instead of racing on independent delays.
      const tl = gsap.timeline({ defaults: { ease: EASE.out } });

      tl.from(q("[data-eyebrow]"), {
        y: 14,
        opacity: 0,
        duration: DUR.fast,
      });

      // Headline — masked line rise, then a per-character shimmer on the
      // emphasised line so the type feels typeset rather than pasted in.
      // Use fromTo so the end state (yPercent:0) is explicit — if the
      // timeline is interrupted the text still ends visible.
      const lines = q("[data-line]") as HTMLElement[];
      // Ensure lines start hidden for the animation, but also schedule a
      // safety fallback that forces them visible if GSAP is interrupted
      // (e.g. reduced-motion toggle, StrictMode double-mount, or a
      // ScrollTrigger error). The fallback is cheap and idempotent.
      tl.fromTo(
        lines,
        { yPercent: 112 },
        { yPercent: 0, duration: DUR.slow, ease: EASE.expo, stagger: 0.1, overwrite: "auto" },
        "-=0.15",
      );

      const accentLine = q("[data-line-accent]")[0] as HTMLElement | undefined;
      if (accentLine) {
        const chars = splitChars(accentLine);
        tl.fromTo(
          chars,
          { opacity: 0.25 },
          { opacity: 1, duration: 0.5, stagger: 0.018, ease: "none" },
          "-=0.7",
        );
      }

      // Safety net: if headline is still translated after 1.6s (timeline
      // killed, e.g. by a fast navigation), force it visible. Keeps the
      // landing page readable even when motion fails.
      const headlineFallback = window.setTimeout(() => {
        gsap.set(lines, { yPercent: 0, opacity: 1, clearProps: "transform" });
        const ac = q("[data-line-accent]")[0] as HTMLElement | undefined;
        if (ac) gsap.set(ac.querySelectorAll<HTMLElement>("[data-char]"), { opacity: 1 });
      }, 1650);
      cleanups.push(() => window.clearTimeout(headlineFallback));

      tl.from(q("[data-hero-sub]"), { y: 22, opacity: 0, duration: DUR.base }, "-=0.5");
      tl.from(q("[data-hero-ctas]"), { y: 18, opacity: 0, duration: DUR.base }, "-=0.45");
      tl.from(
        q("[data-proof] > *"),
        { y: 16, opacity: 0, duration: DUR.fast, stagger: 0.08 },
        "-=0.4",
      );

      // Product panel shell — its contents animate separately, once data lands.
      tl.from(
        q("[data-mock]"),
        { y: 56, scale: 0.94, opacity: 0, duration: DUR.slow, ease: EASE.expo },
        "-=1.1",
      );

      // Aurora blobs drift forever — the only looping motion on the page.
      q("[data-blob]").forEach((blob, i) => {
        gsap.to(blob, {
          x: i % 2 === 0 ? 60 : -50,
          y: i % 2 === 0 ? -40 : 45,
          scale: 1.12,
          duration: 14 + i * 4,
          ease: EASE.ambient,
          yoyo: true,
          repeat: -1,
        });
      });

      // Ambient float + scroll parallax on the panel stack.
      gsap.to(q("[data-float]"), {
        y: -10,
        duration: 3.6,
        ease: EASE.ambient,
        yoyo: true,
        repeat: -1,
        delay: 1.6,
      });
      gsap.fromTo(
        q("[data-parallax]"),
        { y: 30 },
        {
          y: -30,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: "bottom top",
            scrub: 0.5,
          },
        },
      );
      // Copy leaves a touch slower than the panel — cheap depth.
      gsap.to(q("[data-hero-copy]"), {
        y: -40,
        opacity: 0.6,
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "bottom top",
          scrub: 0.6,
        },
      });

      // Interaction polish.
      q("[data-magnetic]").forEach((el) =>
        cleanups.push(magnetic(el as HTMLElement, 0.22)),
      );
      const panel = q("[data-tilt]")[0] as HTMLElement | undefined;
      if (panel) cleanups.push(tilt(panel, 4));
      if (root.current) cleanups.push(pointerSpotlight(root.current));

      return () => cleanups.forEach((fn) => fn());
    },
    { scope: root },
  );

  // Panel contents only exist once /landing/live resolves, so they get their
  // own timeline. Keeping it separate stops the hero copy replaying on fetch.
  useGSAP(
    () => {
      if (!live || !root.current) return;
      const q = gsap.utils.selector(root);
      if (prefersReducedMotion()) return;

      const tl = gsap.timeline({ defaults: { ease: EASE.out } });

      tl.from(q("[data-panel-row]"), {
        y: 18,
        opacity: 0,
        duration: DUR.fast,
        stagger: 0.07,
      });

      tl.from(
        q("[data-dim-bar]"),
        { scaleX: 0, transformOrigin: "left", duration: 0.7, stagger: 0.08 },
        "-=0.6",
      );
    },
    { scope: root, dependencies: [live] },
  );

  return (
    <section
      ref={root}
      className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28"
    >
      {/* Layered background: wash → aurora → grid. */}
      <div className="hero-wash pointer-events-none absolute inset-0 -z-30" />
      <div className="aurora -z-20" aria-hidden>
        <span
          data-blob
          className="left-[-10%] top-[-12%] h-[38rem] w-[38rem] bg-primary/25"
        />
        <span
          data-blob
          className="right-[-12%] top-[-6%] h-[32rem] w-[32rem] bg-sky/25"
        />
        <span
          data-blob
          className="bottom-[-24%] left-[35%] h-[30rem] w-[30rem] bg-accent/20"
        />
      </div>
      <div className="grid-lines pointer-events-none absolute inset-0 -z-10" aria-hidden />

      <div className="container-page grid items-center gap-14 lg:grid-cols-[1.02fr_0.98fr]">
        <div data-hero-copy className="flex flex-col items-start gap-6">
          <span
            data-eyebrow
            className="surface-glass inline-flex items-center gap-2.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-ink-soft"
          >
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-accent text-accent" />
            {live ? (
              `Live · ${live.totals.records_unified.toLocaleString("en-IN")} rows across ${live.totals.data_sources} sources`
            ) : (
              <span className="inline-flex items-center gap-2">
                Connecting to the warehouse
                <Skeleton className="h-3 w-24" />
              </span>
            )}
          </span>

          <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-[3.85rem]">
            {hero.title.map((line, i) => {
              const isLast = i === hero.title.length - 1;
              return (
                <span key={i} className="block overflow-hidden pb-[0.14em] -mb-[0.14em]">
                  <span
                    data-line
                    {...(isLast ? { "data-line-accent": "" } : {})}
                    className={`block will-change-transform ${isLast ? "text-gradient" : ""}`}
                    style={isLast ? undefined : undefined}
                  >
                    {line}
                  </span>
                </span>
              );
            })}
          </h1>

          <p
            data-hero-sub
            className="max-w-xl text-lg leading-relaxed text-ink-soft"
          >
            {hero.subtitle}
          </p>

          <div data-hero-ctas className="flex flex-col gap-3 sm:flex-row">
            <span data-magnetic className="inline-block">
              <Button href="/register" variant="primary" size="lg">
                {hero.primaryCta}
                <Icon name="arrow" className="h-4 w-4" />
              </Button>
            </span>
            <span data-magnetic className="inline-block">
              <Button href="/login" variant="secondary" size="lg">
                Sign in
              </Button>
            </span>
          </div>
          <p data-hero-ctas className="text-xs text-ink-soft">Have an invite? <a href="/signup" className="font-medium text-primary underline underline-offset-2">Join your team →</a> <span className="text-ink-muted">·</span> <a href="/register" className="font-medium text-primary underline underline-offset-2">Register business</a></p>

          {/* Proof strip — real platform-scale figures, not marketing rounding. */}
          <dl
            data-proof
            className="mt-2 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-border/70 pt-6"
          >
            {proof.map((p) => (
              <div key={p.label}>
                <dt className="font-mono text-xl font-semibold tabular-nums text-ink">
                  {p.value ?? <Skeleton className="h-6 w-20" />}
                </dt>
                <dd className="mt-0.5 text-xs text-ink-muted">{p.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div data-mock className="relative w-full will-change-transform">
          <div data-parallax className="w-full">
            <div data-float className="w-full">
              <div data-tilt className="w-full [transform-style:preserve-3d]">
                <LiveDashboard live={live} className="shadow-hero" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
