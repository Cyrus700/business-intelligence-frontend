"use client";

import { useEffect, useState } from "react";
import { clsx } from "@/lib/cx";
import { useAuth } from "@/lib/auth-context";
import { BRAND, NAV_LINKS } from "@/lib/content";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";

export default function Navbar() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={clsx(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-border bg-white/80 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <nav className="container-page flex h-16 items-center justify-between">
        <a href="/" className="flex items-center gap-2 font-semibold text-ink">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-white">
            <Icon name="chart" className="h-4 w-4" />
          </span>
          {BRAND.name}
        </a>

        <ul className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
              >
                {link.label}
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
                "absolute left-0 h-0.5 w-5 bg-ink transition-all",
                open ? "top-1.5 rotate-45" : "top-0",
              )}
            />
            <span
              className={clsx(
                "absolute left-0 top-1.5 h-0.5 w-5 bg-ink transition-all",
                open && "opacity-0",
              )}
            />
            <span
              className={clsx(
                "absolute left-0 h-0.5 w-5 bg-ink transition-all",
                open ? "top-1.5 -rotate-45" : "top-3",
              )}
            />
          </span>
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        className={clsx(
          "overflow-hidden border-border bg-white/95 backdrop-blur-xl transition-all duration-300 md:hidden",
          open ? "max-h-96 border-b" : "max-h-0",
        )}
      >
        <ul className="container-page flex flex-col gap-1 py-4">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-bg-soft hover:text-ink"
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
