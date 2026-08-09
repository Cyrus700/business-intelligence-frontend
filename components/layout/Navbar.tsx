"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { clsx } from "@/lib/cx";
import { DUR, EASE, prefersReducedMotion } from "@/lib/motion";
import { useAuth } from "@/lib/auth-context";
import { BRAND, NAV_LINKS } from "@/lib/content";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import BrandLogo from "@/components/ui/BrandLogo";

export default function Navbar() {
  const { user } = useAuth();
  const root = useRef<HTMLElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useGSAP(
    () => {
      if (!root.current || prefersReducedMotion()) return;
      gsap.from(root.current, {
        y: -16,
        opacity: 0,
        duration: DUR.base,
        ease: EASE.out,
        delay: 0.1,
      });

      // Reading-progress rail scrubbed against total page scroll.
      const bar = root.current.querySelector("[data-progress]");
      if (bar) {
        gsap.fromTo(
          bar,
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: "none",
            scrollTrigger: {
              trigger: document.body,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.3,
            },
          },
        );
      }
    },
    { scope: root },
  );

  useGSAP(
    () => {
      const el = menu.current;
      if (!el) return;
      const links = gsap.utils.toArray<HTMLElement>("[data-menu-link]", el);
      if (prefersReducedMotion()) {
        gsap.set(el, { height: open ? "auto" : 0, opacity: open ? 1 : 0 });
        return;
      }
      if (open) {
        gsap.to(el, {
          height: "auto",
          opacity: 1,
          duration: DUR.fast,
          ease: EASE.inOut,
        });
        gsap.fromTo(
          links,
          { y: 10, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: DUR.fast,
            ease: EASE.out,
            stagger: 0.045,
            delay: 0.12,
          },
        );
      } else {
        gsap.to(el, {
          height: 0,
          opacity: 0,
          duration: DUR.fast,
          ease: EASE.inOut,
        });
      }
    },
    { scope: root, dependencies: [open] },
  );

  return (
    <header
      ref={root}
      className={clsx(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-border bg-white/80 shadow-[0_8px_32px_-16px_rgba(15,23,42,0.14)] backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      {/* Reading progress — only meaningful once the page has been scrolled. */}
      <span
        aria-hidden
        className={clsx(
          "absolute inset-x-0 bottom-0 h-px origin-left bg-gradient-to-r from-primary via-violet to-accent transition-opacity duration-300",
          scrolled ? "opacity-100" : "opacity-0",
        )}
        data-progress
      />

      <nav className="container-page flex h-16 items-center justify-between">
        <Link href="/" aria-label={`${BRAND.name} home`} className="group flex items-center">
          <BrandLogo
            height={40}
            priority
            imgClassName="transition-transform duration-300 group-hover:scale-105"
          />
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="group relative text-sm font-medium text-ink-soft transition-colors hover:text-ink"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-primary transition-transform duration-300 group-hover:scale-x-100" />
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <Button href="/dashboard" variant="primary" size="md">
              Dashboard
              <Icon name="arrow" className="h-4 w-4" />
            </Button>
          ) : (
            <>
              <Button href="/login" variant="ghost" size="md">
                Log in
              </Button>
              <Button href="/signup" variant="primary" size="md">
                Get started
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-white md:hidden"
        >
          <span className="relative block h-3.5 w-5">
            <span
              className={clsx(
                "absolute left-0 h-0.5 w-5 bg-ink transition-all duration-300",
                open ? "top-1.5 rotate-45" : "top-0",
              )}
            />
            <span
              className={clsx(
                "absolute left-0 top-1.5 h-0.5 w-5 bg-ink transition-all duration-300",
                open && "opacity-0",
              )}
            />
            <span
              className={clsx(
                "absolute left-0 h-0.5 w-5 bg-ink transition-all duration-300",
                open ? "top-1.5 -rotate-45" : "top-3",
              )}
            />
          </span>
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        ref={menu}
        aria-hidden={!open}
        style={{ height: 0, opacity: 0 }}
        className="overflow-hidden border-border bg-white/95 backdrop-blur-xl md:hidden"
      >
        <ul className="container-page flex flex-col gap-1 py-4">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={() => setOpen(false)}
                data-menu-link
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-bg-soft hover:text-ink"
              >
                {link.label}
              </a>
            </li>
          ))}
          <li className="mt-2 flex gap-3 px-3">
            {user ? (
              <Button href="/dashboard" variant="primary" size="md" className="flex-1">
                Dashboard
              </Button>
            ) : (
              <>
                <Button href="/login" variant="secondary" size="md" className="flex-1">
                  Log in
                </Button>
                <Button href="/signup" variant="primary" size="md" className="flex-1">
                  Get started
                </Button>
              </>
            )}
          </li>
        </ul>
      </div>
    </header>
  );
}