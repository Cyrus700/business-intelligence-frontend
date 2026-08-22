import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import SignupForm from "@/components/auth/SignupForm";

export const metadata: Metadata = { title: "Create account · Insightful" };

// Open-redirect guard: only accept a `next` that stays inside the app —
// either the legacy bare path or a role-prefixed one (proxy.ts owns turning
// the former into the latter for an authenticated visit). Empty means "no
// explicit destination", letting the form redirect to the fresh account's
// own role home instead of guessing.
const DASHBOARD_NEXT = /^\/(?:dashboard(?:\/|$)|[a-z][a-z0-9_-]{1,31}\/dashboard(?:\/|$))/;

function safeNext(value: string | null): string {
  if (!value) return "";
  return DASHBOARD_NEXT.test(value) ? value : "";
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <AuthShell
      title="Start for free"
      subtitle="Create your account — no credit card required."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:text-primary-600">
            Sign in
          </Link>
        </>
      }
    >
      <SignupForm next={safeNext(next ?? null)} />
    </AuthShell>
  );
}
