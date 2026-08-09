"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import Icon from "@/components/ui/Icon";
import { clsx } from "@/lib/cx";
import { Markdown } from "@/lib/markdown";
import { polishReply } from "@/lib/reply-polish";
import {
  aiAnalyze,
  aiChat,
  aiChatStream,
  getConversationMessages,
  getConversations,
} from "@/lib/api";
import type { AIConversation, AIMessage as AIMsg } from "@/lib/api";

const STARTERS = [
  "What's our revenue trend this month?",
  "Which products need restocking?",
  "What does the 30-day forecast look like?",
  "Any anomalies detected?",
  "Top products right now?",
  "Compare expenses vs revenue",
];

// Stable, render-safe id generator for ephemeral chat bubbles.
let msgSeq = 0;
function tempId(prefix: string): string {
  msgSeq += 1;
  return `${prefix}${msgSeq}`;
}

function friendlyTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
      className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 text-xs font-medium text-ink-muted opacity-0 transition-opacity hover:bg-bg-soft hover:text-ink group-hover:opacity-100"
      aria-label="Copy response"
    >
      <Icon name={copied ? "check" : "copy"} className="h-3.5 w-3.5" />
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function AIClient() {
  const [convs, setConvs] = useState<AIConversation[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [analyzeMode, setAnalyzeMode] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<{ answer: string; suggestions: string[] } | null>(null);
  const [analyzeQuestion, setAnalyzeQuestion] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadConvs = useCallback(async () => {
    try {
      setConvs(await getConversations());
    } catch {
      /* ignore */
    }
  }, []);

  const loadMessages = useCallback(async (convId: string) => {
    try {
      setMessages(await getConversationMessages(convId));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    getConversations()
      .then((data) => {
        if (!cancelled) setConvs(data);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [analyzeMode]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  async function handleSend(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    setStreaming(true);

    const userMsg: AIMsg = {
      id: tempId("u"),
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    const assistantId = tempId("a");
    const assistantMsg: AIMsg = {
      id: assistantId,
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    const controller = new AbortController();
    abortRef.current = controller;

    let didStream = false;
    try {
      const conversationId = await aiChatStream(
        { conversation_id: activeConv ?? undefined, message: text },
        (chunk) => {
          didStream = true;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: polishReply(m.content + chunk) } : m,
            ),
          );
        },
        controller.signal,
      );
      setActiveConv(conversationId);
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId && !m.content ? { ...m, content: "_(empty response)_" } : m)),
      );
      await loadConvs();
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content || "_(Generation stopped.)_" } : m,
          ),
        );
      } else if (!didStream) {
        // Streaming unavailable/errored before any text — fall back to the non-streaming endpoint.
        try {
          const res = await aiChat({
            conversation_id: activeConv ?? undefined,
            message: text,
          });
          setActiveConv(res.conversation_id);
          setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: polishReply(res.reply) } : m)));
          await loadConvs();
        } catch (e2) {
          const err = e2 instanceof Error ? e2.message : "Request failed. Check your connection.";
          setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: `⚠️ ${err}` } : m)));
        }
      } else {
        // Stream errored mid-way — keep whatever was generated and explain.
        const err = e instanceof Error ? e.message : "Request failed. Check your connection.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content ? `${m.content}\n\n⚠️ _Reply interrupted: ${err}_` : `⚠️ ${err}` }
              : m,
          ),
        );
      }
    } finally {
      abortRef.current = null;
      setStreaming(false);
      setSending(false);
      inputRef.current?.focus();
    }
  }

  async function handleAnalyze() {
    const q = analyzeQuestion.trim();
    if (!q || analyzing) return;
    setAnalyzing(true);
    setAnalyzeResult(null);
    try {
      setAnalyzeResult(await aiAnalyze({ question: q }));
    } catch (e) {
      setAnalyzeResult({ answer: e instanceof Error ? e.message : "Analysis failed", suggestions: [] });
    } finally {
      setAnalyzing(false);
    }
  }

  function selectConv(conv: AIConversation) {
    stop();
    setActiveConv(conv.id);
    loadMessages(conv.id);
    setSidebarOpen(false);
    setAnalyzeMode(false);
  }

  function newChat() {
    stop();
    setActiveConv(null);
    setMessages([]);
    setAnalyzeMode(false);
    inputRef.current?.focus();
  }

  function suggestClick(s: string) {
    if (analyzeMode) {
      setAnalyzeQuestion(s);
    } else if (!sending) {
      handleSend(s);
    }
  }

  return (
    <>
      <PageHeader
        title="AI Assistant"
        subtitle={analyzeMode ? "Ask questions about your business data" : "Chat with Insightful AI"}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setAnalyzeMode(!analyzeMode);
                setAnalyzeResult(null);
              }}
              className={clsx(
                "inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors",
                analyzeMode
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-white text-ink hover:bg-bg-soft",
              )}
            >
              <Icon name="search" className="h-4 w-4" />
              Analyze
            </button>
            <button
              onClick={newChat}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-white shadow-lift hover:bg-primary-600"
            >
              <Icon name="spark" className="h-4 w-4" />
              New chat
            </button>
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-ink lg:hidden"
              aria-label="Toggle conversations"
            >
              <Icon name="menu" className="h-5 w-5" />
            </button>
          </div>
        }
      />

      <div className="flex gap-4">
        <div className={clsx("w-72 shrink-0 flex-col border-r border-border pr-4", sidebarOpen ? "flex" : "hidden lg:flex")}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Conversations</h3>
            <button onClick={newChat} className="text-xs font-medium text-primary hover:underline">+ New</button>
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 220px)" }}>
            {convs.length === 0 && (
              <p className="py-8 text-center text-sm text-ink-muted">No conversations yet. Start chatting!</p>
            )}
            {convs.map((c) => (
              <button
                key={c.id}
                onClick={() => selectConv(c)}
                className={clsx(
                  "w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                  activeConv === c.id
                    ? "bg-primary-50 text-primary"
                    : "text-ink-soft hover:bg-bg-soft hover:text-ink",
                )}
              >
                <span className="block truncate font-medium">{c.title}</span>
                <span className="mt-0.5 block text-xs text-ink-muted">
                  {c.message_count} message{c.message_count !== 1 ? "s" : ""} · {new Date(c.created_at).toLocaleDateString()}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          {analyzeMode ? (
            <Panel title="Data Analysis" subtitle="Ask any question about your business data">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    value={analyzeQuestion}
                    onChange={(e) => setAnalyzeQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                    placeholder="e.g., What's our revenue trend this month?"
                    className="h-11 flex-1 rounded-xl border border-border bg-white px-3.5 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                  />
                  <button
                    onClick={handleAnalyze}
                    disabled={analyzing || !analyzeQuestion.trim()}
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-white shadow-lift hover:bg-primary-600 disabled:opacity-50"
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
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <div className="text-sm leading-relaxed text-ink">
                      <Markdown text={analyzeResult.answer} />
                    </div>
                    {analyzeResult.suggestions.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {analyzeResult.suggestions.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => suggestClick(s)}
                            className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-bg-soft hover:text-ink"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Panel>
          ) : (
            <Panel title="" subtitle="">
              <div
                ref={listRef}
                className="space-y-4 overflow-y-auto"
                style={{ maxHeight: "calc(100vh - 300px)" }}
              >
                {messages.length === 0 && (
                  <div className="flex flex-col items-center py-14 text-center">
                    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                      <Icon name="spark" className="h-7 w-7" />
                    </span>
                    <h3 className="mt-4 text-lg font-semibold text-ink">Ask Insightful AI</h3>
                    <p className="mt-1 max-w-md text-sm text-ink-soft">
                      Your BI co-pilot analyses <strong>live dashboard data</strong> — revenue, expenses,
                      forecasts, inventory, anomalies and product performance.
                    </p>
                    <div className="mt-6 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
                      {STARTERS.map((s) => (
                        <button
                          key={s}
                          onClick={() => suggestClick(s)}
                          className="rounded-xl border border-border bg-white px-4 py-3 text-left text-sm font-medium text-ink-soft transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-ink"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m, i) => (
                  <div key={m.id} className={clsx("group flex gap-3", m.role === "user" ? "justify-end" : "justify-start")}>
                    {m.role === "assistant" && (
                      <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                        <Icon name="spark" className="h-4 w-4" />
                      </span>
                    )}
                    <div
                      className={clsx(
                        "relative flex max-w-[80%] flex-col gap-1.5 rounded-2xl px-4 py-3",
                        m.role === "user" ? "bg-primary text-white" : "bg-bg-soft text-ink",
                      )}
                    >
                      {m.role === "assistant" ? (
                        <Markdown text={m.content || (streaming && i === messages.length - 1 ? "▍" : "")} />
                      ) : (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
                      )}
                      <div className={clsx("flex items-center gap-2 text-[10px] text-ink-muted", m.role === "assistant" ? "" : "justify-end")}>
                        <span>{friendlyTime(m.created_at)}</span>
                        {m.role === "assistant" && m.content && (
                          <CopyButton text={m.content} />
                        )}
                      </div>
                    </div>
                    {m.role === "user" && (
                      <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-ink/10 text-ink">
                        <Icon name="user" className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                ))}

                {streaming && messages.length === 0 && (
                  <div className="flex gap-3">
                    <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Icon name="spark" className="h-4 w-4" />
                    </span>
                    <div className="rounded-2xl bg-bg-soft px-4 py-3">
                      <span className="flex gap-1">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-ink-muted" style={{ animationDelay: "0ms" }} />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-ink-muted" style={{ animationDelay: "150ms" }} />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-ink-muted" style={{ animationDelay: "300ms" }} />
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={streaming ? "Generating…" : "Ask anything about your business data…"}
                  maxLength={2000}
                  disabled={streaming}
                  className="h-11 flex-1 rounded-xl border border-border bg-white px-3.5 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:opacity-60"
                />
                {streaming ? (
                  <button
                    onClick={stop}
                    className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-medium text-ink hover:bg-bg-soft"
                    aria-label="Stop generating"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                      <rect x="6" y="6" width="12" height="12" rx="1.5" />
                    </svg>
                    Stop
                  </button>
                ) : (
                  <button
                    onClick={() => handleSend()}
                    disabled={sending || !input.trim()}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white shadow-lift hover:bg-primary-600 disabled:opacity-50"
                    aria-label="Send"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                    </svg>
                  </button>
                )}
              </div>
              <p className="mt-2 text-center text-[11px] text-ink-muted">
                Insightful AI answers from your live dashboard data and may make mistakes. Verify important figures.
              </p>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}