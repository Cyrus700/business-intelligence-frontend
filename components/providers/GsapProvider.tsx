"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { getMotionOverride, setMotionOverride } from "@/lib/motion";

// Register GSAP plugins exactly once on the client.
gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function GsapProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // ?motion=on forces animations for this browser even when the OS asks for
    // reduced motion; ?motion=auto restores the OS preference. Read once here
    // so every section sees the same answer.
    const param = new URLSearchParams(window.location.search).get("motion");
    if (param === "on" || param === "auto") setMotionOverride(param);

    // Mirror the decision onto <html> so the reduced-motion CSS block can step
    // aside — otherwise its `opacity: 1 !important` fights GSAP's inline fades.
    document.documentElement.dataset.motion =
      getMotionOverride() === "on" ? "force" : "auto";

    // Failsafe: ensure reveal content becomes visible even if ScrollTrigger stalls
    // (slow network, handler error, phone where trigger calc fails, etc.).
    // GSAP will already have animated them before this fires; this just
    // unblocks invisibility. Covers both [data-reveal] (SectionHeading etc.)
    // and direct gsap.from targets like [data-feature], [data-step-card]…
    const revealTimer = window.setTimeout(() => {
      document.documentElement.classList.add("reveal-ready");
    }, 1200);
    const forceVisibleTimer = window.setTimeout(() => {
      // Inline styles from gsap.from({opacity:0,y:34}) win over the
      // .reveal-ready CSS rule, so we must clear them via gsap.set.
      const landingSelectors =
        "[data-reveal], [data-feature], [data-step-card], [data-step-badge], [data-row], [data-head-row], [data-check], [data-badge], [data-sec-icon], [data-stat], [data-counter], [data-panel-row], [data-dim-bar]";
      gsap.set(landingSelectors, {
        opacity: 1,
        y: 0,
        x: 0,
        yPercent: 0,
        scale: 1,
        scaleX: 1,
        clearProps: "transform,opacity",
      });
      document.documentElement.classList.add("reveal-ready");
    }, 1800);
    const onFirstScroll = () => {
      document.documentElement.classList.add("reveal-ready");
    };
    window.addEventListener("scroll", onFirstScroll, { once: true, passive: true });

    // Recalculate trigger positions after fonts/images settle.
    const refresh = () => ScrollTrigger.refresh();
    const id = window.setTimeout(refresh, 300);
    window.addEventListener("load", refresh);
    return () => {
      window.clearTimeout(id);
      window.clearTimeout(revealTimer);
      window.clearTimeout(forceVisibleTimer);
      window.removeEventListener("load", refresh);
      window.removeEventListener("scroll", onFirstScroll);
    };
  }, []);

  return <>{children}</>;
}
