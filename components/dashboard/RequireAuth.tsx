"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
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
