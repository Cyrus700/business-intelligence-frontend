import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import VerifyEmailClient from "@/components/auth/VerifyEmailClient";

export const metadata: Metadata = { title: "Verify email · Insightful" };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthShell
      title="Verify your email"
      subtitle="Confirm your business email to continue."
      footer={
        <>
          Already verified? <Link href="/login" className="font-medium text-primary hover:text-primary-600">Sign in</Link>
        </>
      }
    >
      <VerifyEmailClient token={token ?? ""} />
    </AuthShell>
  );
}
