"use client";

// Single source of truth for all AI chat state. Both the /dashboard/ai page
// and the global floating AI widget subscribe to this store so they stay in
// sync (same conversation, same messages, single stream).

import { create } from "zustand";
import {
  aiChat,
  aiChatStream,
  getConversationMessages,
  getConversations,
  type AIConversation,
  type AIMessage,
} from "@/lib/api";
import { polishReply } from "@/lib/reply-polish";

// Stable, render-safe id generator for ephemeral chat bubbles.
let msgSeq = 0;
function tempId(prefix: string): string {
  msgSeq += 1;
  return `${prefix}${msgSeq}`;
}

type AiStore = {
  conversations: AIConversation[];
  conversationsLoaded: boolean;
  activeId: string | null;
  messages: AIMessage[];
  draft: string;
  streaming: boolean;
  error: string | null;
};

type AiActions = {
  fetchConversations: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  newChat: () => void;
  setDraft: (value: string) => void;
  sendMessage: (text: string) => Promise<void>;
  stopStreaming: () => void;
};

// Widget open state also lives here so any component can open/close it.
type WidgetState = {
  widgetOpen: boolean;
  setWidgetOpen: (open: boolean) => void;
};

let controller: AbortController | null = null;

export const useAiStore = create<AiStore & AiActions>()((set, get) => ({
  conversations: [],
  conversationsLoaded: false,
  activeId: null,
  messages: [],
  draft: "",
  streaming: false,
  error: null,

  fetchConversations: async () => {
    try {
      set({ conversations: await getConversations(), conversationsLoaded: true });
    } catch {
      set({ conversationsLoaded: true });
    }
  },

  selectConversation: async (id) => {
    if (get().streaming) controller?.abort();
    controller = null;
    set({ activeId: id, messages: [], error: null });
    try {
      set({ messages: await getConversationMessages(id) });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Failed to load messages." });
    }
  },

  newChat: () => {
    if (get().streaming) controller?.abort();
    controller = null;
    set({ activeId: null, messages: [], draft: "", error: null, streaming: false });
  },

  setDraft: (value) => set({ draft: value }),

  // Single-stream guarantee: one in-flight generation at a time app-wide.
  sendMessage: async (text) => {
    const trimmed = text.trim();
    if (!trimmed || get().streaming) return;

    const userMsg: AIMessage = {
      id: tempId("u"),
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    const assistantMsg: AIMessage = {
      id: tempId("a"),
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
    };

    set({
      messages: [...get().messages, userMsg, assistantMsg],
      draft: "",
      streaming: true,
      error: null,
    });

    const ctrl = new AbortController();
    controller = ctrl;

    let receivedAny = false;
    const patchAssistant = (content: string) =>
      set({ messages: get().messages.map((m) => (m.id === assistantMsg.id ? { ...m, content } : m)) });

    try {
      const convId = await aiChatStream(
        { conversation_id: get().activeId ?? undefined, message: trimmed },
        (chunk) => {
          receivedAny = true;
          const current = get().messages.find((m) => m.id === assistantMsg.id)?.content ?? "";
          patchAssistant(polishReply(current + chunk));
        },
        ctrl.signal,
      );
      set({ activeId: convId });
      const last = get().messages.at(-1);
      if (last?.id === assistantMsg.id && !last.content) patchAssistant("_(Empty response)_");
      await get().fetchConversations();
    } catch (e) {
      const aborted = e instanceof DOMException && (e.name === "AbortError" || e.name === "CanceledError");
      if (aborted) {
        const cur = get().messages.find((m) => m.id === assistantMsg.id)?.content ?? "";
        patchAssistant(cur || "_(Generation stopped.)_");
      } else if (!receivedAny) {
        // Streaming unavailable/errored before any text — fall back to the non-streaming endpoint.
        try {
          const res = await aiChat({
            conversation_id: get().activeId ?? undefined,
            message: trimmed,
          });
          set({ activeId: res.conversation_id });
          patchAssistant(polishReply(res.reply));
          await get().fetchConversations();
        } catch (e2) {
          patchAssistant(`⚠️ ${e2 instanceof Error ? e2.message : "Request failed. Check your connection."}`);
        }
      } else {
        // Stream errored mid-way — keep whatever was generated and explain.
        const err = e instanceof Error ? e.message : "Request failed. Check your connection.";
        const cur = get().messages.find((m) => m.id === assistantMsg.id)?.content ?? "";
        patchAssistant(cur ? `${cur}\n\n⚠️ _Reply interrupted: ${err}_` : `⚠️ ${err}`);
      }
    } finally {
      if (controller === ctrl) controller = null;
      set({ streaming: false });
    }
  },

  stopStreaming: () => {
    controller?.abort();
  },
}));

export const useAiWidget = create<WidgetState>()((set) => ({
  widgetOpen: false,
  setWidgetOpen: (open) => set({ widgetOpen: open }),
}));