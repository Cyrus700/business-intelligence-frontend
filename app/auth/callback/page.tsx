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

  useEffect(() => {
    const token = searchParams.get("token");
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
