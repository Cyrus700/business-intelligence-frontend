"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession, useSession } from "@/lib/auth";

// Client-side gate for the mock session. Redirects to /login when there's no
// session, otherwise renders the dashboard.
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const session = useSession();

  useEffect(() => {
    // Read localStorage directly (authoritative) so a transient null from the
    // useSyncExternalStore hydration snapshot can't trigger a false redirect.
    if (!getSession()) router.replace("/login");
  }, [router]);

  if (!session) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg-soft">
        <div className="flex flex-col items-center gap-3 text-ink-soft">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <span className="text-sm">Loading your workspace…</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
