"use client";

import { useMemo, useSyncExternalStore } from "react";
import { apiPost, apiGet, apiPatch } from "@/lib/api";
import type { UserProfile } from "@/lib/api";

const SESSION_KEY = "insightful.session";
const TOKEN_KEY = "insightful.token";

// Presence cookie for the server-side route gate (proxy.ts). The JWT itself
// stays in localStorage; the proxy only needs a cheap "is someone signed in"
// signal, so a session-scoped marker suffices. The role cookie rides
// alongside it so the proxy can also route /<role>/dashboard/* without
// decoding the JWT at the edge — it's routing UX only, never an authority
// boundary (the API re-checks the real JWT role on every request).
const AUTH_COOKIE = "insightful.auth";
const ROLE_COOKIE = "insightful.role";
const AUTH_COOKIE_MAX_AGE = 60 * 60 * 12;

export type Session = { name: string; email: string };

function roleFromToken(token: string): string | null {
  const payload = decodeTokenPayload(token);
  const meta = payload?.app_metadata as Record<string, unknown> | undefined;
  const role = meta?.role;
  return typeof role === "string" ? role : null;
}

function setAuthCookie(token: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE}=1; path=/; max-age=${AUTH_COOKIE_MAX_AGE}; samesite=lax`;
  const role = roleFromToken(token);
  document.cookie = role
    ? `${ROLE_COOKIE}=${role}; path=/; max-age=${AUTH_COOKIE_MAX_AGE}; samesite=lax`
    : `${ROLE_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

function clearAuthCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0; samesite=lax`;
  document.cookie = `${ROLE_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

/** Reflects the current token into the auth cookie. Safe to call repeatedly. */
export function syncSessionCookie() {
  if (typeof window === "undefined") return;
  const token = getToken();
  if (token) setAuthCookie(token);
  else clearAuthCookie();
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
  setAuthCookie(token);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(TOKEN_KEY);
  if (stored) return stored;
  return process.env.NEXT_PUBLIC_DEV_API_TOKEN ?? null;
}

export function clearToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  clearAuthCookie();
}

export function clearAll() {
  clearSession();
  clearToken();
}

export function decodeTokenPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split(".")[1];
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export function setSession(session: Session) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}

export function nameFromEmail(email: string) {
  const local = email.split("@")[0] ?? "there";
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

export function useSession(): Session | null {
  const raw = useSyncExternalStore(
    subscribe,
    () => (typeof window !== "undefined" ? window.localStorage.getItem(SESSION_KEY) : null),
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

export function sessionFromToken(token: string): Session | null {
  const payload = decodeTokenPayload(token);
  if (!payload) return null;
  const email = (payload.email as string) ?? "";
  const name =
    (payload.app_metadata as Record<string, unknown> | undefined)?.["name"] as string | undefined ??
    nameFromEmail(email);
  return { name, email };
}

// ── Real API auth functions ──────────────────────────────────────────

export type LoginBody = { email: string; password: string };
export type SignupBody = { email: string; password: string; full_name?: string | null };
export type AuthResult = {
  token: string;
  user: UserProfile;
};

export async function login(body: LoginBody): Promise<AuthResult> {
  const res = await apiPost<AuthResult>("/auth/login", body);
  setToken(res.token);
  setSession({ email: res.user.email, name: res.user.full_name ?? nameFromEmail(res.user.email) });
  return res;
}

export async function signup(body: SignupBody): Promise<AuthResult> {
  const res = await apiPost<AuthResult>("/auth/signup", body);
  setToken(res.token);
  setSession({ email: res.user.email, name: res.user.full_name ?? nameFromEmail(res.user.email) });
  return res;
}

export async function forgotPassword(email: string): Promise<void> {
  await apiPost("/auth/forgot-password", { email });
}

export async function getProfile(): Promise<UserProfile> {
  return apiGet<UserProfile>("/auth/me");
}

export async function validateSession(): Promise<UserProfile | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const profile = await getProfile();
    setSession({ email: profile.email, name: profile.full_name ?? nameFromEmail(profile.email) });
    return profile;
  } catch {
    clearAll();
    return null;
  }
}

export type ProfileUpdate = {
  full_name?: string | null;
  department?: string | null;
};

export type UserPreferences = {
  two_factor: boolean;
  anomaly_alerts: boolean;
  weekly_digest: boolean;
};

export async function updateProfile(body: ProfileUpdate): Promise<UserProfile> {
  return apiPatch<UserProfile>("/auth/me", body);
}

export async function getPreferences(): Promise<UserPreferences> {
  return apiGet<UserPreferences>("/auth/me/preferences");
}

export async function updatePreferences(body: Partial<UserPreferences>): Promise<UserPreferences> {
  return apiPatch<UserPreferences>("/auth/me/preferences", body);
}
