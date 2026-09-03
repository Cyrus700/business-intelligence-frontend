// Shared GSAP motion tokens so every section animates with one consistent feel.
import gsap from "gsap";

export const EASE = {
  out: "power3.out",
  inOut: "power2.inOut",
  pop: "back.out(1.7)",
  ambient: "sine.inOut",
  // Long, weighted deceleration for hero-scale entrances.
  expo: "expo.out",
} as const;

export const DUR = {
  quick: 0.35,
  fast: 0.4,
  base: 0.7,
  slow: 1.1,
} as const;

// Standard "rise + fade" entrance state, reused across reveals.
export const REVEAL_FROM = { y: 28, opacity: 0 } as const;
export const REVEAL_TO = {
  y: 0,
  opacity: 1,
  duration: DUR.base,
  ease: EASE.out,
} as const;

// ScrollTrigger config that fires a one-shot reveal as a block enters view.
export const revealTrigger = (el: Element) => ({
  trigger: el,
  start: "top 82%",
  once: true,
});

// ── Motion preference ────────────────────────────────────────────
// Every animated section calls prefersReducedMotion() and skips straight to
// the final state when it returns true. That is the correct default: an OS
// "Reduce motion" setting must be honoured.
//
// It also means a developer with Reduce motion enabled sees no animation
// anywhere and reasonably concludes GSAP is broken. MOTION_OVERRIDE_KEY is an
// explicit, per-browser opt-out of that behaviour — never on by default, so
// real visitors always get their own preference respected.
//
//   ?motion=on    force animations on in this browser (persists)
//   ?motion=auto  go back to following the OS setting

export const MOTION_OVERRIDE_KEY = "insightflow:motion";
const LEGACY_MOTION_OVERRIDE_KEY = "insightful:motion";

export type MotionOverride = "on" | "auto";

export function getMotionOverride(): MotionOverride {
  if (typeof window === "undefined") return "auto";
  try {
    const v = window.localStorage.getItem(MOTION_OVERRIDE_KEY) ?? window.localStorage.getItem(LEGACY_MOTION_OVERRIDE_KEY);
    return v === "on" ? "on" : "auto";
  } catch {
    return "auto"; // private mode / storage disabled
  }
}

export function setMotionOverride(value: MotionOverride): void {
  if (typeof window === "undefined") return;
  try {
    if (value === "on") {
      window.localStorage.setItem(MOTION_OVERRIDE_KEY, "on");
      window.localStorage.removeItem(LEGACY_MOTION_OVERRIDE_KEY);
    } else {
      window.localStorage.removeItem(MOTION_OVERRIDE_KEY);
      window.localStorage.removeItem(LEGACY_MOTION_OVERRIDE_KEY);
    }
  } catch {
    /* storage unavailable — the override simply won't persist */
  }
}

export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  if (getMotionOverride() === "on") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// ── Premium motion primitives ────────────────────────────────────
// Shared so the landing sections animate as one system rather than a pile of
// one-off tweens. Every one of these is a no-op under reduced motion.

/**
 * Split an element's text into per-character spans for staggered reveals.
 * GSAP's SplitText is a paid plugin, so this does the same job for plain text.
 * Returns the created spans (empty if the node has already been split).
 */
export function splitChars(el: HTMLElement): HTMLElement[] {
  if (el.dataset.split === "done") {
    return Array.from(el.querySelectorAll<HTMLElement>("[data-char]"));
  }
  const text = el.textContent ?? "";
  el.textContent = "";
  const chars: HTMLElement[] = [];
  for (const ch of text) {
    const span = document.createElement("span");
    // Non-breaking space keeps word gaps from collapsing once inline-block.
    span.textContent = ch === " " ? " " : ch;
    span.style.display = "inline-block";
    span.style.willChange = "transform, opacity";
    span.dataset.char = "";
    el.appendChild(span);
    chars.push(span);
  }
  el.dataset.split = "done";
  return chars;
}

/**
 * Pull an element gently toward the cursor while it is hovered.
 * Returns a cleanup function for useGSAP's teardown.
 */
export function magnetic(el: HTMLElement, strength = 0.28): () => void {
  if (prefersReducedMotion()) return () => {};
  const move = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    gsap.to(el, {
      x: (e.clientX - (r.left + r.width / 2)) * strength,
      y: (e.clientY - (r.top + r.height / 2)) * strength,
      duration: 0.5,
      ease: EASE.out,
    });
  };
  const reset = () =>
    gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" });

  el.addEventListener("pointermove", move);
  el.addEventListener("pointerleave", reset);
  return () => {
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerleave", reset);
    gsap.set(el, { x: 0, y: 0 });
  };
}

/**
 * Drift an element against the scroll for depth. `distance` is the total
 * travel in px across the trigger's full pass through the viewport.
 */
export function parallax(el: Element, distance = 60, trigger?: Element) {
  if (prefersReducedMotion()) return;
  return gsap.fromTo(
    el,
    { y: distance / 2 },
    {
      y: -distance / 2,
      ease: "none",
      scrollTrigger: {
        trigger: trigger ?? el,
        start: "top bottom",
        end: "bottom top",
        scrub: 0.6,
      },
    },
  );
}

/**
 * Track the pointer across a container and expose it as CSS custom properties
 * (--mx / --my, in %) so spotlights and sheens can follow it without React
 * re-renders. Returns a cleanup function.
 */
export function pointerSpotlight(el: HTMLElement): () => void {
  const move = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
  };
  el.addEventListener("pointermove", move);
  return () => el.removeEventListener("pointermove", move);
}

/**
 * Subtle 3D tilt toward the cursor. Used on the live dashboard panel so it
 * reads as a physical object. Returns a cleanup function.
 */
export function tilt(el: HTMLElement, max = 6): () => void {
  if (prefersReducedMotion()) return () => {};
  const move = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    gsap.to(el, {
      rotateY: ((e.clientX - (r.left + r.width / 2)) / (r.width / 2)) * max,
      rotateX: -((e.clientY - (r.top + r.height / 2)) / (r.height / 2)) * max,
      transformPerspective: 1200,
      duration: 0.6,
      ease: EASE.out,
    });
  };
  const reset = () =>
    gsap.to(el, { rotateX: 0, rotateY: 0, duration: 0.9, ease: EASE.out });

  el.addEventListener("pointermove", move);
  el.addEventListener("pointerleave", reset);
  return () => {
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerleave", reset);
    gsap.set(el, { rotateX: 0, rotateY: 0 });
  };
}

/** Seamless infinite marquee over a track that contains two identical halves. */
export function marquee(track: HTMLElement, seconds = 34) {
  if (prefersReducedMotion()) return;
  return gsap.to(track, {
    xPercent: -50,
    duration: seconds,
    ease: "none",
    repeat: -1,
  });
}

/** Draw an SVG path on as it scrolls into view. */
export function drawPath(
  path: SVGPathElement,
  { duration = 1.4, trigger }: { duration?: number; trigger?: Element } = {},
) {
  const len = path.getTotalLength();
  gsap.set(path, { strokeDasharray: len });
  if (prefersReducedMotion()) {
    gsap.set(path, { strokeDashoffset: 0 });
    return;
  }
  return gsap.fromTo(
    path,
    { strokeDashoffset: len },
    {
      strokeDashoffset: 0,
      duration,
      ease: EASE.out,
      scrollTrigger: { trigger: trigger ?? path, start: "top 78%", once: true },
    },
  );
}

// Animate a numeric node from 0 → "to" via a proxy object, fired once on scroll.
export function countUp(
  el: HTMLElement,
  to: number,
  {
    decimals = 0,
    duration = DUR.slow,
    trigger = el,
    format: formatter,
  }: {
    decimals?: number;
    duration?: number;
    trigger?: Element;
    /** Override the default fixed-decimal rendering (e.g. compact currency). */
    format?: (v: number) => string;
  } = {},
) {
  const format = formatter ?? ((v: number) => v.toFixed(decimals));
  const proxy = { v: 0 };
  el.textContent = format(0);
  return gsap.to(proxy, {
    v: to,
    duration,
    ease: EASE.out,
    onUpdate: () => {
      el.textContent = format(proxy.v);
    },
    scrollTrigger: {
      trigger,
      start: "top 82%",
      once: true,
    },
  });
}