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
import { aiAnalyze, getRetention, setRetention, triggerRetentionFlush } from "@/lib/api";
import { useHasMinRole } from "@/lib/use-role";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

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
  const toast = useToast();

  // retention (admin only)
  const isAdmin = useHasMinRole("admin");
  const [retention, setRetentionState] = useState<number | null>(null);
  const [retentionSaving, setRetentionSaving] = useState(false);
  const [showFlushAll, setShowFlushAll] = useState(false);
  const [showFlushExpired, setShowFlushExpired] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!isAdmin) return;
    void getRetention()
      .then((r) => setRetentionState(r.retention_days))
      .catch(() => {});
  }, [isAdmin]);

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
      <label className="relative mb-3 block">
        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search conversations…"
          className="h-9 w-full rounded-xl border border-border/70 bg-bg-soft/70 pl-9 pr-3 text-[13px] text-ink placeholder:text-ink-muted focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
        />
      </label>

      {/* Actions bar */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
          History {conversations.length > 0 && <span className="ml-1 rounded-full bg-ink/5 px-1.5 py-0.5 text-[10px] font-bold text-ink-soft">{conversations.length}</span>}
        </span>
        {conversations.length > 0 && (
          <button
            type="button"
            onClick={() => setShowFlushAll(true)}
            className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-ink-soft ring-1 ring-border hover:bg-warn-50 hover:text-warn hover:ring-warn/20 transition-colors"
          >
            <Icon name="trash" className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 space-y-1.5 overflow-y-auto pr-0.5 -mr-1 custom-scrollbar">
        {conversationsLoaded && conversations.length === 0 && (
          <div className="py-10 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Icon name="spark" className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-medium text-ink">No conversations yet</p>
            <p className="mt-1 text-xs text-ink-muted">Start a new chat to see it here</p>
          </div>
        )}
        {conversationsView.map((c) => {
          const isActive = activeId === c.id;
          return (
            <div key={c.id} className="group relative">
              <button
                type="button"
                onClick={() => {
                  void selectConversation(c.id);
                  setSidebarOpen(false);
                }}
                className={clsx(
                  "flex w-full items-start gap-3 rounded-2xl px-3.5 py-3 text-left transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-br from-primary to-primary-600 text-white shadow-lift"
                    : "bg-white border border-border/50 hover:border-primary/20 hover:bg-bg-soft hover:shadow-sm",
                )}
              >
                <span className={clsx("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl", isActive ? "bg-white/15 text-white" : "bg-primary/10 text-primary")}>
                  <Icon name="message" className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={clsx("block truncate text-[13px] font-semibold leading-tight", isActive ? "text-white" : "text-ink")}>{c.title}</span>
                  <span className={clsx("mt-1 flex items-center gap-2 text-[11px]", isActive ? "text-white/70" : "text-ink-muted")}>
                    <span className={clsx("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium", isActive ? "bg-white/15 text-white" : "bg-bg-soft text-ink-muted")}>
                      {c.message_count} msgs
                    </span>
                    <span>{dateLabel(c.created_at)}</span>
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setDeleteId(c.id)}
                className={clsx(
                  "absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full shadow-sm ring-1 transition-all duration-200",
                  "bg-white text-ink-muted ring-border hover:bg-warn hover:text-white hover:ring-warn",
                  "opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary",
                  isActive && "bg-white text-warn ring-white/30 hover:bg-warn hover:text-white",
                )}
                aria-label="Delete conversation"
              >
                <Icon name="trash" className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
        {filter && conversationsView.length === 0 && (
          <p className="py-6 text-center text-xs text-ink-muted">No matches for “{filter}”.</p>
        )}
      </div>

      {/* Admin: auto-flush retention - premium dark card */}
      {isAdmin && (
        <div className="mt-4 rounded-[20px] border border-ink/10 bg-gradient-to-br from-ink via-ink to-[#1e293b] p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-white ring-1 ring-white/10 backdrop-blur">
              <Icon name="clock" className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white">Retention</p>
              <p className="text-xs font-medium text-white/70">Auto-flush history</p>
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-white/60">History auto-deletes after this period. Applies to all users. System admin only.</p>
          <label className="mt-3 block">
            <span className="mb-1.5 block text-[11px] font-semibold tracking-wide text-white/70">Keep for</span>
            <div className="relative">
              <select
                value={retention ?? 30}
                onChange={async (e) => {
                  const v = Number(e.target.value);
                  setRetentionSaving(true);
                  try {
                    const r = await setRetention(v);
                    setRetentionState(r.retention_days);
                    toast(`Retention set to ${v === 0 ? "keep forever" : v + " days"}`, { type: "success" });
                  } catch (err) {
                    toast(err instanceof Error ? err.message : "Failed to save", { type: "error" });
                  } finally {
                    setRetentionSaving(false);
                  }
                }}
                disabled={retentionSaving || retention === null}
                className="w-full appearance-none rounded-xl border border-white/10 bg-white px-3 py-2.5 pr-9 text-sm font-semibold text-ink shadow-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-white/10 disabled:opacity-60"
              >
                <option value={7}>7 days — week</option>
                <option value={14}>14 days — 2 weeks</option>
                <option value={30}>30 days — month</option>
                <option value={60}>60 days — 2 months</option>
                <option value={90}>90 days — quarter</option>
                <option value={180}>180 days — 6 months</option>
                <option value={365}>365 days — year</option>
                <option value={0}>Keep forever — no auto-flush</option>
              </select>
              <Icon name="chevron-down" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            </div>
          </label>
          <button
            type="button"
            onClick={() => setShowFlushExpired(true)}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-ink shadow-sm hover:bg-white/90 transition-colors"
          >
            <Icon name="trash" className="h-3.5 w-3.5" />
            Flush expired now
          </button>
          {retention !== null && (
            <p className="mt-2.5 text-center text-[10px] font-medium tracking-wide text-white/50">
              {retention === 0 ? "Never auto-deletes" : `Deletes idle threads > ${retention} days at 02:15`}
            </p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      <PageHeader
        title="AI Assistant"
        subtitle={
          mode === "analyze"
            ? "Ask questions about your business data"
            : "Chat with InsightFlow AI — your BI co-pilot"
        }
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={newChat}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-gradient-to-br from-primary to-primary-600 px-5 text-sm font-semibold text-white shadow-lift transition-all hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
            >
              <Icon name="plus" className="h-4 w-4" />
              New chat
            </button>
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-ink shadow-sm lg:hidden hover:bg-bg-soft"
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
          <div className="sticky top-24 flex h-[calc(100dvh-9.5rem)] flex-col overflow-hidden rounded-[20px] border border-border/50 bg-white p-4 shadow-card backdrop-blur">
            <div className="flex items-center justify-between pb-3">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink">Conversations</h3>
              <button
                type="button"
                onClick={newChat}
                className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-primary-600 transition-colors"
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
            className={clsx("absolute inset-0 bg-ink/40 backdrop-blur-sm transition-opacity", sidebarOpen ? "opacity-100" : "opacity-0")}
            onClick={() => setSidebarOpen(false)}
          />
          <div
            className={clsx(
              "absolute inset-y-0 left-0 w-72 bg-white p-5 shadow-2xl transition-transform duration-300",
              sidebarOpen ? "translate-x-0" : "-translate-x-full",
            )}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-tight text-ink">Conversations</h3>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    newChat();
                    setSidebarOpen(false);
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white"
                >
                  <Icon name="plus" className="h-3.5 w-3.5" />
                  New
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-full text-ink-soft hover:bg-bg-soft"
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
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[20px] border border-border/50 bg-white shadow-card h-[calc(100dvh-240px)] min-h-[26rem]">
          <header className="flex flex-wrap items-center gap-3 border-b border-border/60 bg-gradient-to-r from-white to-bg-soft/40 px-5 py-3.5">
            <div className="inline-flex items-center gap-1 rounded-full bg-ink p-1">
              {(["chat", "analyze"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    if (m === "chat") setAnalyzeResult(null);
                  }}
                  className={clsx(
                    "inline-flex h-8 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold transition-all",
                    mode === m ? "bg-white text-ink shadow-sm" : "text-white/70 hover:text-white",
                  )}
                >
                  <Icon name="spark" className="h-3.5 w-3.5" />
                  {m === "chat" ? "Chat" : "Analyze"}
                </button>
              ))}
            </div>

            <div className="ml-auto flex min-w-0 items-center gap-2">
              {mode === "chat" && activeTitle && (
                <span className="hidden sm:block truncate rounded-full bg-white px-3 py-1 text-xs font-medium text-ink shadow-sm ring-1 ring-border truncate max-w-[28ch]">{activeTitle}</span>
              )}
              {streaming && mode === "chat" && (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold tracking-wide text-emerald-700 ring-1 ring-emerald-200">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-600" />
                  Generating
                </span>
              )}
            </div>
          </header>

          {mode === "chat" ? (
            <>
              <MessageList className="min-h-0 flex-1 bg-gradient-to-b from-white to-bg-soft/30" onSuggest={(q) => void useAiStore.getState().sendMessage(q)} />
              <div className="border-t border-border/50 bg-white p-3">
                <Composer />
              </div>
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
                  className="h-11 flex-1 rounded-full border border-border bg-white px-5 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                />
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={analyzing || !analyzeQuestion.trim()}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-br from-primary to-primary-600 px-6 text-sm font-semibold text-white shadow-lift transition-all hover:shadow-lg disabled:opacity-50"
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
                <div className="mt-4 rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/[0.04] to-primary/[0.08] p-5">
                  <div className="text-sm leading-relaxed text-ink">
                    <Markdown text={analyzeResult.answer} />
                  </div>
                  {analyzeResult.suggestions.length > 0 && (
                    <>
                      <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
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
                            className="rounded-full border border-border bg-white px-3.5 py-2 text-xs font-medium text-ink hover:border-primary/20 hover:bg-primary hover:text-white transition-colors"
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

      {/* Professional confirm modals */}
      {showFlushAll && (
        <Modal title="Clear all history?" subtitle={`${conversations.length} conversations will be permanently deleted`} onClose={() => setShowFlushAll(false)}>
          <p className="text-sm leading-relaxed text-ink-soft">This flushes your capped history and cannot be undone. The daily auto-flush will still respect the retention setting.</p>
          <div className="mt-6 flex justify-end gap-2">
            <button onClick={() => setShowFlushAll(false)} className="rounded-full border border-border bg-white px-5 py-2 text-sm font-medium text-ink hover:bg-bg-soft">Cancel</button>
            <button
              onClick={async () => {
                setShowFlushAll(false);
                await useAiStore.getState().flushHistory();
                toast("History cleared", { type: "success" });
              }}
              className="rounded-full bg-warn px-5 py-2 text-sm font-semibold text-white hover:bg-warn/90"
            >
              Flush all
            </button>
          </div>
        </Modal>
      )}
      {showFlushExpired && (
        <Modal title="Flush expired conversations?" subtitle="Deletes threads idle longer than the retention period" onClose={() => setShowFlushExpired(false)}>
          <p className="text-sm leading-relaxed text-ink-soft">Runs the same job as the daily 02:15 auto-flush. Only expired conversations are removed.</p>
          <div className="mt-6 flex justify-end gap-2">
            <button onClick={() => setShowFlushExpired(false)} className="rounded-full border border-border bg-white px-5 py-2 text-sm font-medium text-ink hover:bg-bg-soft">Cancel</button>
            <button
              onClick={async () => {
                setShowFlushExpired(false);
                try {
                  const r = await triggerRetentionFlush();
                  toast(`Flushed ${r.deleted} expired conversations`, { description: `Retention ${r.retention_days} days`, type: "success" });
                  void useAiStore.getState().fetchConversations();
                } catch (e) {
                  toast(e instanceof Error ? e.message : "Flush failed", { type: "error" });
                }
              }}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-600"
            >
              Run now
            </button>
          </div>
        </Modal>
      )}
      {deleteId && (
        <Modal title="Delete conversation?" subtitle="This message thread will be removed" onClose={() => setDeleteId(null)}>
          <div className="mt-6 flex justify-end gap-2">
            <button onClick={() => setDeleteId(null)} className="rounded-full border border-border bg-white px-5 py-2 text-sm font-medium text-ink hover:bg-bg-soft">Cancel</button>
            <button
              onClick={async () => {
                const id = deleteId;
                setDeleteId(null);
                await useAiStore.getState().deleteConversation(id);
                toast("Conversation deleted", { type: "success" });
              }}
              className="rounded-full bg-warn px-5 py-2 text-sm font-semibold text-white hover:bg-warn/90"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
