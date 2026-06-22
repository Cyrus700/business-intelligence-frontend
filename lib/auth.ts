// Lightweight client-side mock "session". No real backend — this is UI-only
// auth so the login flow can gate the dashboard during the FYP demo.

import { useMemo, useSyncExternalStore } from "react";

const KEY = "insightful.session";

export type Session = { name: string; email: string };

export function setSession(session: Session) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(session));
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

// Derive a friendly display name from an email if none was provided.
export function nameFromEmail(email: string) {
  const local = email.split("@")[0] ?? "there";
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

// Reactive session read for client components. Uses useSyncExternalStore so
// SSR renders null and the client reads localStorage without a hydration
// mismatch or a sync setState-in-effect.
function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

export function useSession(): Session | null {
  const raw = useSyncExternalStore(
    subscribe,
    () => (typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null),
    () => null,
  );
  return useMemo(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Session;
    } catch {
      return null;
    }
  }, [raw]);
}
