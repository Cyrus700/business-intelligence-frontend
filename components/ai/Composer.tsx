"use client";

// Shared chat composer for the AI page and the floating widget.
// Auto-grows textarea, Enter to send, Shift+Enter for a new line,
// Stop button while streaming, character counter.

import { useEffect, useRef } from "react";
import { useAiStore } from "@/lib/ai-store";
import { clsx } from "@/lib/cx";

const MAX_LEN = 2000;

export default function Composer({ size = "lg" }: { size?: "lg" | "sm" }) {
  const { draft, setDraft, sendMessage, stopStreaming, streaming } = useAiStore();
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 128)}px`;
  }, [draft]);

  const submit = () => {
    if (streaming || !draft.trim()) return;
    void sendMessage(draft);
  };

  const compact = size === "sm";

  return (
    <div className="border-t border-border bg-white p-3 sm:p-4">
      <div
        className={clsx(
          "flex items-end gap-2 rounded-xl border border-border bg-bg-soft/60 p-1.5 transition-colors focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10",
          compact && "p-1",
        )}
      >
        <textarea
          ref={taRef}
          rows={1}
          value={draft}
          maxLength={MAX_LEN}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={streaming ? "Generating…" : "Ask anything about your business data…"}
          aria-label="Message"
          className={clsx(
            "max-h-32 flex-1 resize-none bg-transparent px-2.5 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none",
            compact ? "text-[13px]" : "",
          )}
        />

        {streaming ? (
          <button
            type="button"
            onClick={stopStreaming}
            className={clsx(
              "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-white font-medium text-ink hover:bg-bg-soft",
              compact ? "h-9 px-2.5 text-xs" : "h-10 px-3.5 text-sm",
            )}
            aria-label="Stop generating"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
              <rect x="6" y="6" width="12" height="12" rx="1.5" />
            </svg>
            <span className={compact ? "hidden" : ""}>Stop</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={streaming || !draft.trim()}
            aria-label="Send"
            className={clsx(
              "grid shrink-0 place-items-center rounded-lg bg-primary text-white shadow-lift transition-all hover:bg-primary-600 disabled:opacity-40 disabled:shadow-none",
              compact ? "h-9 w-9" : "h-10 w-10",
            )}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={compact ? "h-4 w-4" : "h-5 w-5"}>
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between px-1">
        <p className={clsx("text-ink-muted", compact ? "text-[10px]" : "text-[11px]")}>
          AI answers from your live dashboard data and may make mistakes. Verify important figures.
        </p>
        {draft.length > 0 && (
          <span className={clsx("font-mono text-ink-muted", compact ? "text-[10px]" : "text-[11px]")}>
            {draft.length}/{MAX_LEN}
          </span>
        )}
      </div>
    </div>
  );
}