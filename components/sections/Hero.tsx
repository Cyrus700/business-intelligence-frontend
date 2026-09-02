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
  tilt,
} from "@/lib/motion";
import { useLandingData } from "@/lib/landing-api";
import type { PlatformSnapshot } from "@/lib/landing-live";
import { HERO } from "@/lib/content";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import LiveDashboard from "@/components/ui/LiveDashboard";

export default function Hero({
  live,
  lastRunLabel,
}: {
  live: PlatformSnapshot | null;
  lastRunLabel: string | null;
}) {
  const root = useRef<HTMLElement>(null);
  const { data } = useLandingData();
  const hero = data?.hero ?? HERO;

  // Social proof comes in with the HTML or not at all — when the warehouse is
  // unreachable the hero keeps a static, timeless trust line instead.
  const proof = live
    ? [
        {
          value: live.totals.records_unified.toLocaleString("en-IN"),
          label: "rows unified",
        },
        {
          value: `${live.totals.data_sources}`,
          label: "data sources connected",
        },
        {
          value: `${live.pipeline.success_rate_pct}%`,
          label: "ETL success rate",
        },
      ]
    : null;

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const reduce = prefersReducedMotion();
      const cleanups: Array<() => void> = [];

      if (reduce) {
        gsap.set(
          q("[data-anim], [data-line], [data-mock], [data-eyebrow], [data-hero-sub], [data-hero-ctas], [data-proof], [data-panel-row], [data-dim-bar]"),
          { opacity: 1, y: 0, x: 0, scale: 1, scaleX: 1, yPercent: 0 },
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

      // Headline — clean masked line rise. No per-char split on the gradient
      // line so background-clip:text stays reliable on every browser/device.
      tl.from(
        q("[data-line]"),
        { yPercent: 110, duration: DUR.slow, ease: EASE.expo, stagger: 0.08 },
        "-=0.15",
      );

      tl.from(q("[data-hero-sub]"), { y: 22, opacity: 0, duration: DUR.base }, "-=0.45");
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

      // The panel's contents are server-rendered, so they belong to the same
      // choreography — no second timeline waiting on a fetch.
      tl.from(
        q("[data-panel-row]"),
        { y: 18, opacity: 0, duration: DUR.fast, stagger: 0.07 },
        "-=0.7",
      );
      tl.from(
        q("[data-dim-bar]"),
        { scaleX: 0, transformOrigin: "left", duration: 0.7, stagger: 0.08 },
        "-=0.5",
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

  return (
    <section
      ref={root}
      className="relative overflow-hidden pt-28 pb-12 sm:pt-32 sm:pb-16 lg:pt-36 lg:pb-24 xl:pb-28 isolate"
    >
      {/* Layered background: wash → aurora → grid. */}
      <div className="hero-wash pointer-events-none absolute inset-0 -z-30" />
      <div className="aurora -z-20" aria-hidden>
        <span
          data-blob
          className="left-[-12%] top-[-10%] h-[22rem] w-[22rem] sm:h-[30rem] sm:w-[30rem] lg:h-[38rem] lg:w-[38rem] bg-primary/20 sm:bg-primary/25"
        />
        <span
          data-blob
          className="right-[-15%] top-[2%] h-[20rem] w-[20rem] sm:h-[26rem] sm:w-[26rem] lg:h-[32rem] lg:w-[32rem] bg-sky/20 sm:bg-sky/25"
        />
        <span
          data-blob
          className="bottom-[-18%] left-[28%] h-[20rem] w-[20rem] sm:h-[26rem] sm:w-[26rem] lg:h-[30rem] lg:w-[30rem] bg-accent/15 sm:bg-accent/20"
        />
      </div>
      <div className="grid-lines pointer-events-none absolute inset-0 -z-10 opacity-60 sm:opacity-100" aria-hidden />

      <div className="container-page grid items-start lg:items-center gap-8 sm:gap-10 lg:gap-12 xl:gap-14 lg:grid-cols-[1.05fr_0.95fr]">
        <div data-hero-copy className="flex w-full min-w-0 flex-col items-stretch sm:items-start gap-5 sm:gap-6">
          <span
            data-eyebrow
            className="surface-glass inline-flex max-w-full flex-wrap items-center gap-2 rounded-full px-3 py-1.5 text-[11px] sm:gap-2.5 sm:px-3.5 sm:text-xs font-medium text-ink-soft leading-snug"
          >
            <span className="pulse-dot h-1.5 w-1.5 shrink-0 rounded-full bg-accent text-accent" />
            <span className="break-words">{hero.eyebrow}</span>
          </span>

          <h1 className="text-[1.85rem] leading-[1.08] sm:text-4xl lg:text-[2.95rem] xl:text-[3.65rem] font-semibold tracking-tight text-ink text-pretty">
            {hero.title.map((line, i) => {
              const isLast = i === hero.title.length - 1;
              return (
                <span key={i} className="block overflow-hidden pb-[0.12em] -mb-[0.08em]">
                  <span
                    data-line
                    className={`block will-change-transform ${isLast ? "text-gradient" : "text-ink"}`}
                    style={{ opacity: 1 }}
                  >
                    {line}
                  </span>
                </span>
              );
            })}
          </h1>

          <p
            data-hero-sub
            className="max-w-xl text-[15px] sm:text-base lg:text-lg leading-relaxed text-ink-soft text-pretty"
          >
            {hero.subtitle}
          </p>

          <div data-hero-ctas className="flex flex-col gap-3 sm:flex-row w-full sm:w-auto">
            <span data-magnetic className="inline-flex w-full sm:w-auto">
              <Button href="/register" variant="primary" size="lg" className="w-full sm:w-auto justify-center">
                {hero.primaryCta}
                <Icon name="arrow" className="h-4 w-4" />
              </Button>
            </span>
            <span data-magnetic className="inline-flex w-full sm:w-auto">
              <Button href="/login" variant="secondary" size="lg" className="w-full sm:w-auto justify-center">
                Sign in
              </Button>
            </span>
          </div>
          <p data-hero-ctas className="text-xs leading-relaxed text-ink-soft flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="inline-flex flex-wrap items-center gap-1.5">
              Working solo?{" "}
              <a
                href="/signup?tab=personal"
                className="font-medium text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary"
              >
                Create a personal workspace →
              </a>
            </span>
            <span className="hidden text-ink-muted sm:inline">·</span>
            <a href="/register?tab=business" className="font-medium text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary">Register a business</a>
          </p>

          {/* Proof strip — only when live data exists; otherwise a static trust line. */}
          {proof ? (
            <dl
              data-proof
              className="mt-1 sm:mt-2 grid grid-cols-3 gap-4 sm:flex sm:flex-wrap sm:items-center sm:gap-x-6 lg:gap-x-8 gap-y-4 border-t border-border/60 pt-5 sm:pt-6 w-full"
            >
              {proof.map((p) => (
                <div key={p.label} className="min-w-0">
                  <dt className="font-mono text-base sm:text-xl font-semibold tabular-nums text-ink leading-none">
                    {p.value}
                  </dt>
                  <dd className="mt-1.5 text-[10px] sm:text-xs leading-tight text-ink-muted break-words">{p.label}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="mt-1 sm:mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/60 pt-5 sm:pt-6 w-full text-xs sm:text-sm text-ink-soft">
              <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" /> Free to start</span>
              <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" /> Setup in 30 seconds</span>
              <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" /> No credit card</span>
            </div>
          )}
        </div>

        <div data-mock className="relative w-full min-w-0 will-change-transform max-w-[520px] mx-auto lg:max-w-none lg:mx-0">
          <div data-parallax className="w-full">
            <div data-float className="w-full">
              <div data-tilt className="w-full [transform-style:preserve-3d]">
                <LiveDashboard live={live} lastRunLabel={lastRunLabel} className="shadow-hero" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
