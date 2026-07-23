"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  type UserProfile,
} from "@/lib/api";
import {
  login as apiLogin,
  signup as apiSignup,
  forgotPassword as apiForgotPassword,
  validateSession,
  updateProfile as apiUpdateProfile,
  getPreferences as apiGetPreferences,
  updatePreferences as apiUpdatePreferences,
  clearAll,
  useSession,
  getToken,
  setSession,
  type ProfileUpdate,
  type UserPreferences,
} from "@/lib/auth";

export type AuthState = {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName?: string | null) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  updateProfile: (body: ProfileUpdate) => Promise<UserProfile>;
  getPreferences: () => Promise<UserPreferences>;
  updatePreferences: (body: Partial<UserPreferences>) => Promise<UserPreferences>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const session = useSession();
  const router = useRouter();

  const refresh = useCallback(async () => {
    const profile = await validateSession();
    setUser(profile);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiLogin({ email, password });
    setUser(res.user);
  }, []);

  const signup = useCallback(async (email: string, password: string, fullName?: string | null) => {
    const res = await apiSignup({ email, password, full_name: fullName });
    setUser(res.user);
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    await apiForgotPassword(email);
  }, []);

  const logout = useCallback(() => {
    clearAll();
    setUser(null);
    router.push("/login");
  }, [router]);

  const updateProfileFn = useCallback(async (body: ProfileUpdate) => {
    const updated = await apiUpdateProfile(body);
    setUser(updated);
    setSession({ email: updated.email, name: updated.full_name ?? "" });
    return updated;
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, login, signup, forgotPassword, logout, refresh, updateProfile: updateProfileFn, getPreferences: apiGetPreferences, updatePreferences: apiUpdatePreferences }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
