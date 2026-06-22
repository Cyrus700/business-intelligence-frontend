"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { clsx } from "@/lib/cx";
import { EASE, prefersReducedMotion } from "@/lib/motion";
import { HERO } from "@/lib/content";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import DashboardMock from "@/components/ui/DashboardMock";

export default function Hero() {
  const root = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduce = prefersReducedMotion();
      const q = gsap.utils.selector(root);

      if (reduce) {
        gsap.set(q("[data-anim]"), { opacity: 1, y: 0 });
        gsap.set(card.current, { opacity: 1, scale: 1, filter: "none" });
        return;
      }

      // Entrance timeline
      const tl = gsap.timeline({ defaults: { ease: EASE.out } });
      tl.from(q("[data-anim='eyebrow']"), { y: 16, opacity: 0, duration: 0.6 })
        .from(
          q("[data-anim='line']"),
          { yPercent: 110, opacity: 0, duration: 0.9, stagger: 0.12 },
          "-=0.3",
        )
        .from(
          q("[data-anim='sub']"),
          { y: 20, opacity: 0, duration: 0.7 },
          "-=0.5",
        )
        .from(
          q("[data-anim='cta']"),
          { y: 16, opacity: 0, duration: 0.6, stagger: 0.1, ease: EASE.pop },
          "-=0.4",
        )
        .from(
          card.current,
          { y: 40, opacity: 0, scale: 0.95, filter: "blur(8px)", duration: 1 },
          "-=0.7",
        )
        .from(
          q(".mock-bar"),
          { scaleY: 0, transformOrigin: "bottom", duration: 0.6, stagger: 0.05 },
          "-=0.6",
        );

      // Mouse tilt on the dashboard card (desktop / fine pointer only)
      const fine = window.matchMedia("(pointer: fine)").matches;
      if (fine && card.current) {
        const el = card.current;
        const onMove = (e: MouseEvent) => {
          const r = el.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          gsap.to(el, {
            rotateY: px * 8,
            rotateX: -py * 8,
            duration: 0.5,
            ease: "power2.out",
            transformPerspective: 900,
          });
        };
        const onLeave = () =>
          gsap.to(el, { rotateY: 0, rotateX: 0, duration: 0.6 });
        el.addEventListener("mousemove", onMove);
        el.addEventListener("mouseleave", onLeave);
      }

      // Scroll parallax — card drifts up slower than the page
      gsap.to(card.current, {
        yPercent: -12,
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
      ScrollTrigger.refresh();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28"
    >
      {/* Background layers */}
      <div className="mesh-glow pointer-events-none absolute inset-0 -z-10" />
      <div className="dot-grid pointer-events-none absolute inset-0 -z-10" />

      <div className="container-page grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Copy */}
        <div className="flex flex-col items-start gap-6">
          <span
            data-anim="eyebrow"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3.5 py-1.5 text-xs font-medium text-ink-soft shadow-card"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {HERO.eyebrow}
          </span>

          <h1 className="text-[2.75rem] font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl lg:text-7xl">
            {HERO.title.map((line, i) => (
              <span key={i} className="block overflow-hidden pb-1">
                <span
                  data-anim="line"
                  className={clsx(
                    "block",
                    i === HERO.titleAccentLine && "text-gradient",
                  )}
                >
                  {line}
                </span>
              </span>
            ))}
          </h1>

          <p
            data-anim="sub"
            className="max-w-xl text-lg leading-relaxed text-ink-soft"
          >
            {HERO.subtitle}
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <span data-anim="cta">
              <Button href="/signup" variant="primary" size="lg">
                {HERO.primaryCta}
                <Icon name="arrow" className="h-4 w-4" />
              </Button>
            </span>
            <span data-anim="cta">
              <Button href="#how" variant="secondary" size="lg">
                <Icon name="play" className="h-4 w-4 text-primary" />
                {HERO.secondaryCta}
              </Button>
            </span>
          </div>
        </div>

        {/* Dashboard mock */}
        <div className="relative [perspective:1000px]">
          <div
            className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-primary/10 blur-2xl"
            aria-hidden
          />
          <div ref={card} className="will-change-transform">
            <DashboardMock />
          </div>
        </div>
      </div>
    </section>
  );
}
