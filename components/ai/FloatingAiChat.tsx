"use client";

// Global floating AI assistant. Available on every dashboard page (hidden on
// the full AI workspace). State is shared with /dashboard/ai through the
// zustand store — same conversation, messages and stream.

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAiStore, useAiWidget } from "@/lib/ai-store";
import { useDashboardBase } from "@/lib/use-role";
import MessageList from "@/components/ai/MessageList";
import Composer from "@/components/ai/Composer";
import Icon from "@/components/ui/Icon";
import { clsx } from "@/lib/cx";

export default function FloatingAiChat() {
  const pathname = usePathname();
  const base = useDashboardBase();
  const fullPage = `${base}/ai`;
  const { widgetOpen, setWidgetOpen } = useAiWidget();
  const { streaming } = useAiStore();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!widgetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setWidgetOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [widgetOpen]);

  if (pathname === fullPage) return null;

  return (
    <>
      {/* FAB */}
      <button
        type="button"
        onClick={() => {
          setWidgetOpen(!widgetOpen);
          requestAnimationFrame(() => closeRef.current?.focus());
        }}
        aria-label={widgetOpen ? "Close AI assistant" : "Open AI assistant"}
        aria-expanded={widgetOpen}
        className={clsx(
          "fixed bottom-5 right-5 z-[80] grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-600 text-white shadow-lift transition-transform hover:scale-105 active:scale-95 sm:bottom-6 sm:right-6",
          widgetOpen ? "pointer-events-none scale-0" : "",
        )}
      >
        <Icon name="spark" className="h-6 w-6" />
        {!widgetOpen && streaming && (
          <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-accent" />
        )}
      </button>

      {/* Panel */}
      <div
        className={clsx(
          "fixed bottom-20 right-5 z-[80] flex origin-bottom-right flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-lift transition-all duration-200 sm:bottom-24 sm:right-6",
          "h-[min(40rem,calc(100dvh-7rem))] w-[min(24rem,calc(100vw-2.5rem))] sm:w-96",
          widgetOpen ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="AI assistant chat"
        inert={!widgetOpen}
      >
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-border bg-white px-4 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-600 text-white shadow-lift">
            <Icon name="spark" className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight text-ink">InsightFlow AI</p>
            <p className="flex items-center gap-1.5 text-[11px] leading-tight text-ink-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {streaming ? "Generating…" : "Online · answers from your data"}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={() => setWidgetOpen(false)}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-bg-soft hover:text-ink"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
          <Link
            href={fullPage}
            aria-label="Open full AI workspace"
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-bg-soft hover:text-ink"
          >
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => setWidgetOpen(false)}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-bg-soft hover:text-ink"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </header>

        <MessageList
          size="sm"
          className="min-h-0 flex-1 bg-bg-soft/40"
          onSuggest={(q) => void useAiStore.getState().sendMessage(q)}
        />
        <Composer size="sm" />
      </div>
    </>
  );
}