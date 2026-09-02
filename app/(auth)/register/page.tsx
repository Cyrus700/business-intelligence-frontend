import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import RegisterTabs from "@/components/auth/RegisterTabs";

export const metadata: Metadata = { title: "Register · Insightful" };

const DASHBOARD_NEXT = /^\/(?:dashboard(?:\/|$)|[a-z][a-z0-9_-]{1,31}\/dashboard(?:\/|$))/;

function safeNext(value: string | null): string {
  if (!value) return "";
  return DASHBOARD_NEXT.test(value) ? value : "";
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; invite?: string; token?: string; tab?: string }>;
}) {
  const { next, invite, token, tab } = await searchParams;
  const inviteToken = invite ?? token ?? "";
  const tabParam = tab?.toLowerCase() === "normal" || tab?.toLowerCase() === "business" ? (tab.toLowerCase() as "normal" | "business") : undefined;
  const defaultTab = inviteToken ? "normal" : (tabParam ?? "business");
  return (
    <AuthShell
      title="Create your account"
      subtitle="Personal invite or new business — pick the tab that fits you."
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
