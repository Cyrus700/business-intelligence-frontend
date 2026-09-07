"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setToken, setSession, sessionFromToken } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";
import { dashboardPath } from "@/lib/permissions";
import Link from "next/link";

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackInner />
    </Suspense>
  );
}

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();
  const [error, setError] = useState<string | null>(null);

  // Allow the backend to echo a validated `next` destination (set via ?next= on /auth/google/login)
  // Same guard as login/page.tsx — trust only dashboard routes.
  const DASHBOARD_NEXT = /^\/(?:dashboard(?:\/|$|\?)|[a-z][a-z0-9_-]{1,31}\/dashboard(?:\/|$|\?))/;
  function safeNext(value: string | null): string {
    if (!value) return "";
    let decoded = value;
    try {
      decoded = decodeURIComponent(value);
    } catch {
      return "";
    }
    if (decoded.startsWith("//")) return "";
    return DASHBOARD_NEXT.test(decoded) ? decoded : "";
  }

  useEffect(() => {
    const token = searchParams.get("token");
    const nextRaw = searchParams.get("next");
    const safeNextDest = safeNext(nextRaw);
    if (!token) {
      setError("No token received");
      return;
    }

    const session = sessionFromToken(token);
    if (!session) {
      setError("Invalid token");
      return;
    }

    setToken(token);
    setSession(session);
    refresh().then((profile) => {
      if (safeNextDest) {
        const role = profile?.role;
        const LEGACY = /^\/dashboard(?:\/|$|\?)/;
        const ROLE_PREFIX = /^\/[a-z][a-z0-9_-]{1,31}\/dashboard(?:\/|$|\?)/;
        if (LEGACY.test(safeNextDest)) {
          const rest = safeNextDest.slice("/dashboard".length);
          if (!rest) {
            router.replace(dashboardPath(role));
            return;
          }
          if (rest.startsWith("?")) {
            router.replace(`${dashboardPath(role)}${rest}`);
            return;
          }
          router.replace(dashboardPath(role, rest));
          return;
        }
        if (ROLE_PREFIX.test(safeNextDest)) {
          const m = safeNextDest.match(/^\/[a-z][a-z0-9_-]{1,31}(\/dashboard.*)$/);
          if (m && role) {
            const inner = m[1].slice("/dashboard".length);
            if (!inner) {
              router.replace(dashboardPath(role));
              return;
            }
            if (inner.startsWith("?")) {
              router.replace(`${dashboardPath(role)}${inner}`);
              return;
            }
            router.replace(dashboardPath(role, inner));
            return;
          }
        }
        router.replace(safeNextDest);
        return;
      }
      router.replace(dashboardPath(profile?.role));
    });
  }, [searchParams, router, refresh]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-red-600">Authentication failed</p>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <Link href="/login" className="mt-4 inline-block text-sm font-medium text-primary hover:text-primary-600">
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex items-center gap-3">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        <p className="text-sm text-gray-500">Signing you in...</p>
      </div>
    </div>
  );
}
