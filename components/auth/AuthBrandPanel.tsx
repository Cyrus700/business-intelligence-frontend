"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { EASE, prefersReducedMotion } from "@/lib/motion";
import DashboardMock from "@/components/ui/DashboardMock";
import Icon from "@/components/ui/Icon";

const POINTS = [
  "Real-time dashboards across every department",
  "AI forecasts, anomaly alerts & recommendations",
  "Bank-grade security with role-based access",
];

export default function AuthBrandPanel() {
  const root = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const q = gsap.utils.selector(root);
      gsap
        .timeline({ defaults: { ease: EASE.out } })
        .from(card.current, { y: 40, opacity: 0, scale: 0.96, duration: 0.9 })
        .from(q("[data-fade]"), { y: 18, opacity: 0, duration: 0.6, stagger: 0.12 }, "-=0.4");

      // Gentle perpetual float
      gsap.to(card.current, {
        y: -14,
        duration: 3,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
    },
    { scope: root },
  );

  return (
    <div
      ref={root}
      className="relative hidden overflow-hidden bg-ink lg:flex lg:flex-col lg:justify-between lg:p-12"
    >
      <div className="mesh-glow pointer-events-none absolute inset-0 opacity-90" />
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-20" />

      <div data-fade className="relative">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white/80 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          AI-Driven Cloud Business Intelligence
        </span>
      </div>

      <div className="relative my-8 flex justify-center [perspective:1000px]">
        <div ref={card} className="w-full max-w-md will-change-transform">
          <DashboardMock className="shadow-lift" />
        </div>
      </div>

      <div className="relative flex flex-col gap-5">
        <h2
          data-fade
          className="text-balance text-3xl font-semibold leading-tight tracking-tight text-white"
        >
          Turn scattered data into decisions — in real time.
        </h2>
        <ul className="flex flex-col gap-3">
          {POINTS.map((p) => (
            <li key={p} data-fade className="flex items-center gap-3 text-sm text-white/75">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent/20 text-accent">
                <Icon name="check" className="h-3.5 w-3.5" />
              </span>
              {p}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
