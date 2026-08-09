"use client";

// Full AI workspace: conversation sidebar + chat panel (streaming) +
// one-off data-analysis mode. All chat state lives in the zustand store
// (lib/ai-store.ts) so the page and the global floating widget stay in sync.

import { useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "@/components/dashboard/PageHeader";
import Icon from "@/components/ui/Icon";
import MessageList from "@/components/ai/MessageList";
import Composer from "@/components/ai/Composer";
import { useAiStore } from "@/lib/ai-store";
import { clsx } from "@/lib/cx";
import { Markdown } from "@/lib/markdown";
import { aiAnalyze } from "@/lib/api";

type Mode = "chat" | "analyze";

function dateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  const sameYear = d.getFullYear() === today.getFullYear();
  return d.toLocaleDateString([], sameYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
}

export default function AIClient() {
  const { conversations, conversationsLoaded, activeId, streaming, fetchConversations, selectConversation, newChat } = useAiStore();

  const [mode, setMode] = useState<Mode>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filter, setFilter] = useState("");

  const [analyzeQuestion, setAnalyzeQuestion] = useState("");
  const [analyzeResult, setAnalyzeResult] = useState<{ answer: string; suggestions: string[] } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const analyzeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (mode === "analyze") setTimeout(() => analyzeInputRef.current?.focus(), 50);
  }, [mode]);

  const conversationsView = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, filter]);

  const activeTitle = activeId ? conversations.find((c) => c.id === activeId)?.title : undefined;

  async function handleAnalyze() {
    const q = analyzeQuestion.trim();
    if (!q || analyzing) return;
    setAnalyzing(true);
    setAnalyzeResult(null);
    try {
      setAnalyzeResult(await aiAnalyze({ question: q }));
    } catch (e) {
      setAnalyzeResult({ answer: e instanceof Error ? e.message : "Analysis failed. Try again.", suggestions: [] });
    } finally {
      setAnalyzing(false);
    }
  }

  const sidebarBody = (
    <div className="flex h-full flex-col">
      <label className="relative mb-2 block">
        <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter conversations…"
          className="h-8 w-full rounded-lg border border-border bg-bg-soft pl-8 pr-2 text-xs text-ink placeholder:text-ink-muted focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/10"
        />
      </label>

      <div className="flex-1 space-y-1 overflow-y-auto pr-0.5">
        {conversationsLoaded && conversations.length === 0 && (
          <p className="py-6 text-center text-xs text-ink-muted">
            No conversations yet. Start chatting!
          </p>
        )}
        {conversationsView.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              void selectConversation(c.id);
              setSidebarOpen(false);
            }}
            className={clsx(
              "w-full rounded-xl px-3 py-2.5 text-left transition-colors",
              activeId === c.id
                ? "bg-primary-50 text-primary ring-1 ring-primary/20"
                : "text-ink-soft hover:bg-bg-soft hover:text-ink",
            )}
          >
            <span className="block truncate text-[13px] font-medium">{c.title}</span>
            <span className="mt-0.5 block text-[11px] text-ink-muted">
              {c.message_count} message{c.message_count !== 1 ? "s" : ""} · {dateLabel(c.created_at)}
            </span>
          </button>
        ))}
        {filter && conversationsView.length === 0 && (
          <p className="py-6 text-center text-xs text-ink-muted">No matches for “{filter}”.</p>
        )}
      </div>
    </div>
  );

  return (
    <>
      <PageHeader
        title="AI Assistant"
        subtitle={
          mode === "analyze"
            ? "Ask questions about your business data"
            : "Chat with Insightful AI — your BI co-pilot"
        }
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={newChat}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-white shadow-lift transition-colors hover:bg-primary-600"
            >
              <Icon name="plus" className="h-4 w-4" />
              New chat
            </button>
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-ink lg:hidden"
              aria-label="Toggle conversations"
            >
              <Icon name="menu" className="h-5 w-5" />
            </button>
          </div>
        }
      />

      <div className="flex gap-5">
        {/* Desktop sidebar */}
        <aside className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-24 h-[calc(100dvh-9.5rem)] overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-card">
            <div className="flex items-center justify-between pb-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Conversations</h3>
              <button
                type="button"
                onClick={newChat}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary-50"
              >
                <Icon name="plus" className="h-3.5 w-3.5" />
                New
              </button>
            </div>
            {sidebarBody}
          </div>
        </aside>

        {/* Mobile drawer */}
        <div className={clsx("fixed inset-0 z-50 lg:hidden", sidebarOpen ? "pointer-events-auto" : "pointer-events-none")}>
          <div
            className={clsx("absolute inset-0 bg-ink/40 transition-opacity", sidebarOpen ? "opacity-100" : "opacity-0")}
            onClick={() => setSidebarOpen(false)}
          />
          <div
            className={clsx(
              "absolute inset-y-0 left-0 w-72 bg-white p-5 shadow-lift transition-transform duration-300",
              sidebarOpen ? "translate-x-0" : "-translate-x-full",
            )}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">Conversations</h3>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    newChat();
                    setSidebarOpen(false);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary-50"
                >
                  <Icon name="plus" className="h-3.5 w-3.5" />
                  New
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft hover:bg-bg-soft"
                  aria-label="Close conversations"
                >
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </div>
            </div>
            {sidebarBody}
          </div>
        </div>

        {/* Main panel */}
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-card h-[calc(100dvh-240px)] min-h-[26rem]">
          <header className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3.5">
            <div className="inline-flex items-center gap-1 rounded-lg bg-bg-soft p-1">
              {(["chat", "analyze"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    if (m === "chat") setAnalyzeResult(null);
                  }}
                  className={clsx(
                    "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors",
                    mode === m ? "bg-white text-primary shadow-sm" : "text-ink-soft hover:text-ink",
                  )}
                >
                  <Icon name="spark" className="h-3.5 w-3.5" />
                  {m === "chat" ? "Chat" : "Analyze"}
                </button>
              ))}
            </div>

            <div className="ml-auto flex min-w-0 items-center gap-2">
              {mode === "chat" && activeTitle && (
                <span className="truncate text-sm font-medium text-ink">{activeTitle}</span>
              )}
              {streaming && mode === "chat" && (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent-50 px-2.5 py-0.5 text-[11px] font-medium text-accent">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                  Generating
                </span>
              )}
            </div>
          </header>

          {mode === "chat" ? (
            <>
              <MessageList className="min-h-0 flex-1" onSuggest={(q) => void useAiStore.getState().sendMessage(q)} />
              <Composer />
            </>
          ) : (
            <div className="p-5">
              <div className="flex gap-2">
                <input
                  ref={analyzeInputRef}
                  value={analyzeQuestion}
                  onChange={(e) => setAnalyzeQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                  placeholder="e.g., What's our revenue trend this month?"
                  className="h-11 flex-1 rounded-xl border border-border bg-white px-3.5 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                />
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={analyzing || !analyzeQuestion.trim()}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-white shadow-lift transition-colors hover:bg-primary-600 disabled:opacity-50"
                >
                  {analyzing ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <Icon name="search" className="h-4 w-4" />
                  )}
                  Analyze
                </button>
              </div>

              {analyzeResult && (
                <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div className="text-sm leading-relaxed text-ink">
                    <Markdown text={analyzeResult.answer} />
                  </div>
                  {analyzeResult.suggestions.length > 0 && (
                    <>
                      <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                        Follow up
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {analyzeResult.suggestions.map((s, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setMode("chat");
                              setAnalyzeResult(null);
                              void useAiStore.getState().sendMessage(s);
                            }}
                            className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:bg-bg-soft hover:text-ink"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </>
  );
}