"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import Icon from "@/components/ui/Icon";
import { clsx } from "@/lib/cx";
import { aiChat, aiAnalyze, getConversations, getConversationMessages } from "@/lib/api";
import type { AIChatResponse, AIConversation, AIMessage as AIMsg } from "@/lib/api";
import { useRole } from "@/lib/use-role";

export default function AIClient() {
  const role = useRole();
  const [convs, setConvs] = useState<AIConversation[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [analyzeMode, setAnalyzeMode] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<{ answer: string; suggestions: string[] } | null>(null);
  const [analyzeQuestion, setAnalyzeQuestion] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadConvs = useCallback(async () => {
    try {
      const data = await getConversations();
      setConvs(data);
    } catch { /* ignore */ }
  }, []);

  const loadMessages = useCallback(async (convId: string) => {
    try {
      const data = await getConversationMessages(convId);
      setMessages(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadConvs(); }, [loadConvs]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);

    const userMsg: AIMsg = { id: "temp", role: "user", content: text, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res: AIChatResponse = await aiChat({
        conversation_id: activeConv ?? undefined,
        message: text,
      });
      setActiveConv(res.conversation_id);
      const assistantMsg: AIMsg = { id: "resp", role: "assistant", content: res.reply, created_at: new Date().toISOString() };
      setMessages((prev) => [...prev, assistantMsg]);
      await loadConvs();
    } catch (e) {
      const errMsg: AIMsg = { id: "err", role: "assistant", content: e instanceof Error ? e.message : "Request failed. Check your connection.", created_at: new Date().toISOString() };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setSending(false);
    }
  }

  async function handleAnalyze() {
    const q = analyzeQuestion.trim();
    if (!q || analyzing) return;
    setAnalyzing(true);
    setAnalyzeResult(null);
    try {
      const res = await aiAnalyze({ question: q });
      setAnalyzeResult(res);
    } catch (e) {
      setAnalyzeResult({ answer: e instanceof Error ? e.message : "Analysis failed", suggestions: [] });
    } finally {
      setAnalyzing(false);
    }
  }

  function selectConv(conv: AIConversation) {
    setActiveConv(conv.id);
    loadMessages(conv.id);
    setSidebarOpen(false);
    setAnalyzeMode(false);
  }

  function newChat() {
    setActiveConv(null);
    setMessages([]);
    setAnalyzeMode(false);
    inputRef.current?.focus();
  }

  function suggestClick(s: string) {
    if (analyzeMode) {
      setAnalyzeQuestion(s);
    } else {
      setInput(s);
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
              onClick={() => { setAnalyzeMode(!analyzeMode); setAnalyzeResult(null); }}
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
          </div>
        }
      />

      <div className="flex gap-4">
        <div className={clsx(
          "w-72 shrink-0 flex-col border-r border-border pr-4",
          sidebarOpen ? "flex" : "hidden lg:flex",
        )}>
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
                  {c.message_count} message{c.message_count !== 1 ? "s" : ""}
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
                    <p className="text-sm leading-relaxed text-ink">{analyzeResult.answer}</p>
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
                  <div className="flex flex-col items-center py-16 text-center">
                    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                      <Icon name="spark" className="h-7 w-7" />
                    </span>
                    <h3 className="mt-4 text-lg font-semibold text-ink">Ask Insightful AI</h3>
                    <p className="mt-1 max-w-md text-sm text-ink-soft">
                      Your BI co-pilot. Ask about revenue, expenses, forecasts, inventory, anomalies, or any dashboard KPI.
                    </p>
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                      {[
                        "What's our revenue trend?",
                        "Which products need restocking?",
                        "Any anomalies detected?",
                        "30-day revenue forecast",
                        "Compare expenses vs revenue",
                      ].map((s) => (
                        <button
                          key={s}
                          onClick={() => setInput(s)}
                          className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-bg-soft hover:text-ink"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={clsx(
                      "flex gap-3",
                      m.role === "user" ? "justify-end" : "justify-start",
                    )}
                  >
                    {m.role === "assistant" && (
                      <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                        <Icon name="spark" className="h-4 w-4" />
                      </span>
                    )}
                    <div
                      className={clsx(
                        "max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                        m.role === "user"
                          ? "bg-primary text-white"
                          : "bg-bg-soft text-ink",
                      )}
                      style={{ whiteSpace: "pre-wrap" }}
                    >
                      {m.content}
                    </div>
                    {m.role === "user" && (
                      <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-ink/10 text-ink">
                        <Icon name="user" className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                ))}

                {sending && (
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

              <div className="mt-4 flex gap-2 border-t border-border pt-4">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Ask anything about your business data..."
                  className="h-11 flex-1 rounded-xl border border-border bg-white px-3.5 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !input.trim()}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white shadow-lift hover:bg-primary-600 disabled:opacity-50"
                >
                  {sending ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
