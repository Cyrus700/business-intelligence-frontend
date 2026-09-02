"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { DUR, EASE, prefersReducedMotion, revealTrigger } from "@/lib/motion";
import { BRAND, FOOTER } from "@/lib/content";
import Container from "@/components/ui/Container";
import Icon from "@/components/ui/Icon";
import BrandLogo from "@/components/ui/BrandLogo";

export default function Footer() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el || prefersReducedMotion()) return;
      const q = gsap.utils.selector(root);

      gsap.from(q("[data-footer-col]"), {
        y: 22,
        opacity: 0,
        duration: DUR.base,
        ease: EASE.out,
        stagger: 0.08,
        scrollTrigger: revealTrigger(el),
      });
      gsap.from(q("[data-footer-bottom]"), {
        y: 16,
        opacity: 0,
        duration: DUR.base,
        ease: EASE.out,
        delay: 0.3,
        scrollTrigger: revealTrigger(el),
      });
    },
    { scope: root },
  );

  return (
    <footer ref={root} className="border-t border-border bg-bg-soft">
      <Container className="py-10 sm:py-12 lg:py-16">
        <div className="grid gap-8 sm:gap-10 lg:gap-12 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div data-footer-col className="flex flex-col gap-4 sm:col-span-2 lg:col-span-1">
            <a href="#" aria-label={`${BRAND.name} home`} className="group flex w-fit items-center">
              <BrandLogo
                height={36}
                imgClassName="transition-transform duration-300 group-hover:scale-105 sm:h-10"
              />
            </a>
            <p className="max-w-xs text-sm leading-relaxed text-ink-soft">
              {BRAND.tagline} — turning scattered data into confident, real-time
              decisions for teams of every size.
            </p>
            <span className="mt-1 inline-flex w-fit max-w-full flex-wrap items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-ink-soft leading-tight">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span className="break-words">{FOOTER.note}</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:contents">
            {FOOTER.columns.map((col) => (
              <div key={col.title} data-footer-col className="flex flex-col gap-3 min-w-0">
                <h3 className="text-sm font-semibold text-ink">{col.title}</h3>
                <ul className="flex flex-col gap-2 sm:gap-2.5">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-sm text-ink-soft transition-colors hover:text-primary break-words"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div
          data-footer-bottom
          className="mt-10 sm:mt-12 flex flex-col items-center justify-between gap-3 sm:gap-4 border-t border-border pt-6 sm:pt-8 text-xs sm:text-sm text-ink-muted text-center sm:text-left sm:flex-row"
        >
          <p className="leading-tight">
            © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
          </p>
          <p className="leading-tight opacity-80">Final Year Project · Asia Pacific University</p>
        </div>
      </Container>
    </footer>
  );
}