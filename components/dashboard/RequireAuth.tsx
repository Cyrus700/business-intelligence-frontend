"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { clearAll, syncSessionCookie } from "@/lib/auth";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Mirrors the localStorage token into the auth cookie so the
        // server-side proxy gate stays in sync (OAuth/any session source).
        syncSessionCookie();
      } else {
        // Preserve the page the user tried to reach so post-login can return there.
        // Also clear any stale marker cookie so the proxy doesn't think we're still signed in
        // and bounce between /login and /dashboard.
        clearAll();
        // Use window.location directly to avoid useSearchParams() suspense requirement
        // during static prerender (RequireAuth is in the dashboard layout).
        let current = "";
        if (typeof window !== "undefined") {
          current = `${window.location.pathname}${window.location.search}`;
        }
        const DASHBOARD_NEXT = /^\/(?:dashboard(?:\/|$|\?)|[a-z][a-z0-9_-]{1,31}\/dashboard(?:\/|$|\?))/;
        let next = "";
        try {
          // Only preserve dashboard destinations; otherwise fall back to plain /login
          if (current && DASHBOARD_NEXT.test(decodeURIComponent(current))) next = current;
        } catch {
          next = "";
        }
        router.replace(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
      }
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg-soft">
        <div className="flex flex-col items-center gap-3 text-ink-soft">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <span className="text-sm">Loading your workspace…</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
