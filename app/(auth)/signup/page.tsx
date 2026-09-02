import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import RegisterTabs from "@/components/auth/RegisterTabs";

export const metadata: Metadata = { title: "Create account · Insightful" };

// Open-redirect guard: only accept a `next` that stays inside the app —
const DASHBOARD_NEXT = /^\/(?:dashboard(?:\/|$)|[a-z][a-z0-9_-]{1,31}\/dashboard(?:\/|$))/;

function safeNext(value: string | null): string {
  if (!value) return "";
  return DASHBOARD_NEXT.test(value) ? value : "";
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; invite?: string; token?: string; tab?: string }>;
}) {
  const { next, invite, token, tab } = await searchParams;
  const inviteToken = invite ?? token ?? "";
  const tabParam = tab?.toLowerCase() === "personal" || tab?.toLowerCase() === "business" ? (tab.toLowerCase() as "personal" | "business") : undefined;
  const defaultTab = inviteToken ? "personal" : (tabParam ?? "personal");

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start a personal workspace, or create one for your business."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:text-primary-600">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterTabs defaultTab={defaultTab} next={safeNext(next ?? null)} inviteToken={inviteToken} />
    </AuthShell>
  );
}
