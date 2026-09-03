"use client";

// Shared message list used by both the full AI page and the floating widget.
// Renders user/assistant bubbles, streaming caret, typing indicator and the
// empty-state (starter prompts). Size prop scales the touch targets.

import { useEffect, useRef, useState } from "react";
import { clsx } from "@/lib/cx";
import { Markdown } from "@/lib/markdown";
import { useAiStore } from "@/lib/ai-store";
import Icon from "@/components/ui/Icon";

const STARTERS_LARGE = [
  "What's our revenue trend this month?",
  "Which products need restocking?",
  "What does the 30-day forecast look like?",
  "Any anomalies detected?",
  "Top products right now?",
  "Compare expenses vs revenue",
];

const STARTERS_SMALL = [
  "What's our revenue trend this month?",
  "Any anomalies detected?",
  "Top products right now?",
  "Compare expenses vs revenue",
];

function friendlyTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function TypingDots({ className }: { className?: string }) {
  return (
    <span className={clsx("ai-typing text-primary", className)} role="status" aria-label="Generating reply">
      <span />
      <span />
      <span />
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-white px-2 text-[11px] font-medium text-ink-muted opacity-0 transition-opacity hover:bg-bg-soft hover:text-ink group-hover:opacity-100"
      aria-label="Copy response"
    >
      <Icon name={copied ? "check" : "copy"} className="h-3 w-3" />
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function EmptyState({ compact, onSuggest }: { compact: boolean; onSuggest: (q: string) => void }) {
  const starters = compact ? STARTERS_SMALL : STARTERS_LARGE;
  return (
    <div className={clsx("flex flex-col items-center justify-center text-center", compact ? "px-4 py-6" : "py-14")}>
      <span
        className={clsx(
          "grid place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-600 text-white shadow-lift",
          compact ? "h-10 w-10" : "h-14 w-14",
        )}
      >
        <Icon name="spark" className={compact ? "h-5 w-5" : "h-7 w-7"} />
      </span>
      <h3 className={clsx("mt-3 font-semibold text-ink", compact ? "text-sm" : "text-lg")}>
        Ask InsightFlow AI
      </h3>
      <p className={clsx("mt-1 max-w-md text-ink-soft", compact ? "text-xs" : "text-sm")}>
        Your BI co-pilot analyses <strong className="font-medium">live dashboard data</strong> — revenue,
        expenses, forecasts, inventory and anomalies.
      </p>
      <div className={clsx("mt-5 grid w-full gap-2", compact ? "grid-cols-1" : "max-w-xl grid-cols-1 sm:grid-cols-2")}>
        {starters.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSuggest(s)}
            className={clsx(
              "rounded-xl border border-border bg-white text-left font-medium text-ink-soft transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-ink",
              compact ? "px-3.5 py-2 text-xs" : "px-4 py-3 text-sm",
            )}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function MessageList({
  size = "lg",
  className,
  onSuggest,
}: {
  size?: "lg" | "sm";
  className?: string;
  onSuggest?: (q: string) => void;
}) {
  const { messages, streaming, error } = useAiStore();
  const listRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  // Capped history: show last N to keep UI fast and avoid giant threads
  const CAP = 40;
  const [showAll, setShowAll] = useState(false);

  const compact = size === "sm";
  const visibleMessages = showAll || messages.length <= CAP ? messages : messages.slice(-CAP);
  const isCapped = !showAll && messages.length > CAP;

  useEffect(() => {
    setShowAll(false);
  }, [messages.length]);

  useEffect(() => {
    const el = listRef.current;
    if (el && atBottom) el.scrollTop = el.scrollHeight;
  }, [messages, streaming, atBottom, visibleMessages.length]);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
  };

  return (
    <div
      ref={listRef}
      onScroll={handleScroll}
      className={clsx("flex flex-col gap-4 overflow-y-auto", compact ? "px-4 py-4" : "px-5 py-5", className)}
    >
      {messages.length === 0 && !streaming && (
        <EmptyState compact={compact} onSuggest={onSuggest ?? (() => {})} />
      )}

      {isCapped && (
        <div className="mx-auto flex items-center gap-2 rounded-full bg-bg-soft px-3 py-1.5 text-xs text-ink-soft">
          <span>
            Showing last {CAP} of {messages.length} messages — history is capped for performance
          </span>
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="font-medium text-primary hover:underline"
          >
            Show all
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={async () => {
              if (confirm("Flush this conversation's history?")) await useAiStore.getState().deleteConversation(useAiStore.getState().activeId ?? "");
            }}
            className="font-medium text-warn hover:underline"
          >
            Flush
          </button>
        </div>
      )}

      {visibleMessages.map((m, i) => {
        const globalIndex = (showAll ? 0 : messages.length - visibleMessages.length) + i;
        return (
        <div
          key={m.id}
          className={clsx("group flex items-end gap-2", m.role === "user" ? "justify-end" : "justify-start")}
        >
          {m.role !== "user" && (
            <span
              className={clsx(
                "grid shrink-0 place-items-center rounded-xl bg-primary/10 text-primary",
                compact ? "h-6 w-6" : "h-8 w-8",
              )}
            >
              <Icon name="spark" className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
            </span>
          )}

          <div
            className={clsx(
              "relative max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
              m.role === "user"
                ? "rounded-br-md bg-gradient-to-br from-primary to-primary-600 text-white shadow-card"
                : "rounded-bl-md border border-border bg-white text-ink shadow-card",
              compact && m.role === "user" ? "max-w-[85%]" : "",
            )}
          >
            {m.role === "user" ? (
              <p className="whitespace-pre-wrap">{m.content}</p>
            ) : m.content ? (
              <>
                <Markdown text={m.content} />
                {streaming && globalIndex === messages.length - 1 && <TypingDots className="mt-1" />}
              </>
            ) : streaming && globalIndex === messages.length - 1 ? (
              <TypingDots />
            ) : (
              // History fix: previously empty assistant bubbles were hidden, making history look like only user messages.
              // Show a placeholder so the thread stays coherent and flushing is obvious.
              <span className="text-ink-muted">— no response recorded —</span>
            )}

            <div
              className={clsx(
                "mt-1 flex items-center gap-2 text-[10px] text-ink-muted",
                m.role === "user" ? "justify-end text-white/70" : "",
              )}
            >
              <span>{friendlyTime(m.created_at)}</span>
              {m.role !== "user" && m.content && <CopyButton text={m.content} />}
            </div>
          </div>

          {m.role === "user" && (
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink/10">
              <Icon name="user" className="h-3.5 w-3.5 text-ink" />
            </span>
          )}
        </div>
        );
      })}

      {streaming && messages.length > 0 && !atBottom && (
        <button
          type="button"
          onClick={() => {
            const el = listRef.current;
            if (el) el.scrollTop = el.scrollHeight;
          }}
          className="sticky bottom-0 rounded-lg bg-primary-50 py-1.5 text-xs font-medium text-primary"
        >
          New message — scroll to view
        </button>
      )}

      {error && (
        <div className="mx-auto flex max-w-md items-start gap-2 rounded-xl border border-warn/30 bg-warn-50 px-3 py-2 text-xs text-warn" role="alert">
          <Icon name="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}