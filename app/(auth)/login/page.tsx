import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Sign in · Insightful" };

// Open-redirect guard: only accept a `next` that stays inside the app —
// either the legacy bare path or a role-prefixed one (proxy.ts owns turning
// the former into the latter for an authenticated visit). Empty means "no
// explicit destination", letting the form redirect to the signed-in
// account's own role home instead of guessing.
const DASHBOARD_NEXT = /^\/(?:dashboard(?:\/|$)|[a-z][a-z0-9_-]{1,31}\/dashboard(?:\/|$))/;

function safeNext(value: string | null): string {
  if (!value) return "";
  return DASHBOARD_NEXT.test(value) ? value : "";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your Insightful dashboard."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-primary hover:text-primary-600">
            Create one
          </Link>
        </>
      }
    >
      <LoginForm next={safeNext(next ?? null)} />
    </AuthShell>
  );
}
