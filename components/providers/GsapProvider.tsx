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
    // (slow network, handler error, etc.). GSAP will already have animated them
    // before this fires in normal operation; this just unblocks invisibility.
    const revealTimer = window.setTimeout(() => {
      document.documentElement.classList.add("reveal-ready");
    }, 1200);
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
      window.removeEventListener("load", refresh);
      window.removeEventListener("scroll", onFirstScroll);
    };
  }, []);

  return <>{children}</>;
}
