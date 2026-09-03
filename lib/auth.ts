"use client";

import { useMemo, useSyncExternalStore } from "react";
import { apiPost, apiGet, apiPatch } from "@/lib/api";
import type { UserProfile } from "@/lib/api";

const SESSION_KEY = "insightflow.session";
const TOKEN_KEY = "insightflow.token";
const LEGACY_SESSION_KEY = "insightful.session";
const LEGACY_TOKEN_KEY = "insightful.token";

// Presence cookie for the server-side route gate (proxy.ts). The JWT itself
// stays in localStorage; the proxy only needs a cheap "is someone signed in"
// signal, so a session-scoped marker suffices. The role cookie rides
// alongside it so the proxy can also route /<role>/dashboard/* without
// decoding the JWT at the edge — it's routing UX only, never an authority
// boundary (the API re-checks the real JWT role on every request).
const AUTH_COOKIE = "insightflow.auth";
const ROLE_COOKIE = "insightflow.role";
const LEGACY_AUTH_COOKIE = "insightful.auth";
const LEGACY_ROLE_COOKIE = "insightful.role";
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
  // Clear legacy cookies once migrated
  document.cookie = `${LEGACY_AUTH_COOKIE}=; path=/; max-age=0; samesite=lax`;
  document.cookie = `${LEGACY_ROLE_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

function clearAuthCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0; samesite=lax`;
  document.cookie = `${ROLE_COOKIE}=; path=/; max-age=0; samesite=lax`;
  document.cookie = `${LEGACY_AUTH_COOKIE}=; path=/; max-age=0; samesite=lax`;
  document.cookie = `${LEGACY_ROLE_COOKIE}=; path=/; max-age=0; samesite=lax`;
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
  // Migrate: remove legacy key if present
  window.localStorage.removeItem(LEGACY_TOKEN_KEY);
  setAuthCookie(token);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(TOKEN_KEY) ?? window.localStorage.getItem(LEGACY_TOKEN_KEY);
  if (stored) {
    // Transparently migrate legacy key to new
    if (!window.localStorage.getItem(TOKEN_KEY) && window.localStorage.getItem(LEGACY_TOKEN_KEY)) {
      window.localStorage.setItem(TOKEN_KEY, stored);
      window.localStorage.removeItem(LEGACY_TOKEN_KEY);
    }
    return stored;
  }
  // Dev fallback must NOT leak into production — only when NODE_ENV !== 'production'
  if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
    return process.env.NEXT_PUBLIC_DEV_API_TOKEN ?? null;
  }
  return null;
}

export function clearToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(LEGACY_TOKEN_KEY);
  clearAuthCookie();
}

export function clearAll() {
  clearSession();
  clearToken();
}

export function decodeTokenPayload(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split(".")[1];
    // JWT uses base64url (-/_) without padding; atob expects standard base64 with padding
    let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4;
    if (pad) base64 += "=".repeat(4 - pad);
    const json = atob(base64);
    // Handle UTF-8 (atob returns binary string)
    try {
      // Decode as UTF-8 via escape sequence (works for JSON payloads which are ASCII mostly)
      return JSON.parse(decodeURIComponent(escape(json)));
    } catch {
      return JSON.parse(json);
    }
  } catch {
    return null;
  }
}

export function setSession(session: Session) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.localStorage.removeItem(LEGACY_SESSION_KEY);
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY) ?? window.localStorage.getItem(LEGACY_SESSION_KEY);
    if (raw && !window.localStorage.getItem(SESSION_KEY) && window.localStorage.getItem(LEGACY_SESSION_KEY)) {
      window.localStorage.setItem(SESSION_KEY, raw);
      window.localStorage.removeItem(LEGACY_SESSION_KEY);
    }
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem(LEGACY_SESSION_KEY);
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
export type SignupBody = { email: string; password: string; full_name?: string | null; invite_token?: string | null };
export type AuthResult = {
  token: string;
  user: UserProfile;
};

export type RegisterOrgBody = { org_name: string; email: string; password: string; full_name?: string | null };
export type RegisterOrgResult = {
  token: string | null;
  user: UserProfile | null;
  organization: { id: string; name: string; status?: string };
  status: string;
  message?: string | null;
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

export async function registerOrg(body: RegisterOrgBody): Promise<RegisterOrgResult> {
  const res = await apiPost<RegisterOrgResult>("/auth/register-org", body);
  // Only set session if approved (token present)
  if (res.token && res.user) {
    setToken(res.token);
    setSession({ email: res.user.email, name: res.user.full_name ?? nameFromEmail(res.user.email) });
  }
  return res;
}

export async function verifyEmail(token: string): Promise<{ message: string }> {
  return apiPost<{ message: string }>("/auth/verify-email", { token });
}

export async function resendVerification(email: string): Promise<{ message: string }> {
  return apiPost<{ message: string }>("/auth/resend-verification", { email });
}

export async function getPendingOrganizations(): Promise<{ id: string; name: string; slug: string | null; status: string; created_at: string }[]> {
  return apiGet<{ id: string; name: string; slug: string | null; status: string; created_at: string }[]>("/auth/admin/pending-organizations");
}

export async function approveOrganization(orgId: string): Promise<{ id: string; name: string; status: string }> {
  return apiPost<{ id: string; name: string; status: string }>(`/auth/admin/organizations/${orgId}/approve`, {});
}

export async function rejectOrganization(orgId: string, reason?: string): Promise<{ id: string; name: string; status: string }> {
  return apiPost<{ id: string; name: string; status: string }>(`/auth/admin/organizations/${orgId}/reject`, { reason });
}

export async function createInvite(email: string, role: string): Promise<unknown> {
  return apiPost("/auth/invite", { email, role });
}

export async function getInvites(): Promise<unknown[]> {
  return apiGet<unknown[]>("/auth/invites");
}

export async function getOrganizations(): Promise<{ id: string; name: string }[]> {
  return apiGet<{ id: string; name: string }[]>("/auth/organizations");
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
