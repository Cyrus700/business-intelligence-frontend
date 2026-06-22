// Shared GSAP motion tokens so every section animates with one consistent feel.

export const EASE = {
  out: "power3.out",
  inOut: "power2.inOut",
  pop: "back.out(1.7)",
} as const;

export const DUR = {
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

export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
