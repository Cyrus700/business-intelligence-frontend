"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { clsx } from "@/lib/cx";
import { DUR, EASE, prefersReducedMotion, revealTrigger } from "@/lib/motion";

export default function Reveal({
  children,
  delay = 0,
  y = 28,
  scale,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  scale?: number;
  className?: string;
  as?: "div" | "span" | "li";
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || prefersReducedMotion()) return;
      const from: gsap.TweenVars = { y, opacity: 0 };
      const to: gsap.TweenVars = {
        y: 0,
        opacity: 1,
        duration: DUR.base,
        ease: EASE.out,
        delay,
        scrollTrigger: revealTrigger(el),
      };
      if (scale) {
        from.scale = scale;
        to.scale = 1;
      }
      gsap.fromTo(el, from, to);
    },
    { scope: ref },
  );

  return (
    // @ts-expect-error — Tag is a constrained string union of intrinsic elements
    <Tag ref={ref} data-reveal className={clsx(className)}>
      {children}
    </Tag>
  );
}
