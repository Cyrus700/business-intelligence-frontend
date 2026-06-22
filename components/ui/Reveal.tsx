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
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "span" | "li";
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || prefersReducedMotion()) return;
      gsap.fromTo(
        el,
        { y, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: DUR.base,
          ease: EASE.out,
          delay,
          scrollTrigger: revealTrigger(el),
        },
      );
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
