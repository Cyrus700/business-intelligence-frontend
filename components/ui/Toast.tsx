"use client";

import { createContext, useCallback, useContext, useState, useEffect } from "react";

type ToastType = "success" | "error" | "info";
type Toast = { id: number; message: string; description?: string; type: ToastType };

const Ctx = createContext<{ toast: (m: string, opts?: { description?: string; type?: ToastType }) => void } | null>(null);

let idCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, opts?: { description?: string; type?: ToastType }) => {
    const id = ++idCounter;
    setToasts((t) => [...t, { id, message, description: opts?.description, type: opts?.type ?? "success" }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[92vw] max-w-[420px] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border bg-white px-4 py-3 shadow-lg backdrop-blur animate-[toast-in_0.22s_ease] ${
              t.type === "success"
                ? "border-emerald-200"
                : t.type === "error"
                ? "border-red-200"
                : "border-border"
            }`}
          >
            <span
              className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-white ${
                t.type === "success" ? "bg-emerald-600" : t.type === "error" ? "bg-red-600" : "bg-ink"
              }`}
            >
              {t.type === "success" ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-4 w-4"><path d="M5 12l4 4 10-10" /></svg>
              ) : t.type === "error" ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path d="M12 8v5M12 16h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path d="M13 16h-1v-4h-1m1-4h.01" /></svg>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-5 text-ink">{t.message}</p>
              {t.description && <p className="mt-0.5 text-xs leading-4 text-ink-soft">{t.description}</p>}
            </div>
            <button
              onClick={() => setToasts((x) => x.filter((q) => q.id !== t.id))}
              className="ml-2 grid h-6 w-6 place-items-center rounded-full text-ink-muted hover:bg-bg-soft hover:text-ink"
              aria-label="Dismiss"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} className="h-3.5 w-3.5"><path d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        ))}
      </div>
      <style>{`@keyframes toast-in{from{opacity:0;transform:translateY(-8px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
    </Ctx.Provider>
  );
}

export function useToast() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useToast must be inside ToastProvider");
  return v.toast;
}
