import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import RegisterBusinessForm from "@/components/auth/RegisterBusinessForm";

export const metadata: Metadata = { title: "Register your business · Insightful" };

export default function RegisterBusinessPage() {
  return (
    <AuthShell
      title="Create your business"
      subtitle="You’ll be Business Admin."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:text-primary-600">
            Sign in
          </Link>
          <span className="mx-2">·</span>
          Have an invite?{" "}
          <Link href="/register" className="font-medium text-primary hover:text-primary-600">
            Join with invite
          </Link>
        </>
      }
    >
      <RegisterBusinessForm />
    </AuthShell>
  );
}
