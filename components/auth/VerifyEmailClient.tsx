"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { verifyEmail, resendVerification } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import Icon from "@/components/ui/Icon";

export default function VerifyEmailClient({ token }: { token: string }) {
  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token. Check your email link or request a new verification email below.");
      return;
    }
    setStatus("verifying");
    verifyEmail(token)
      .then((res) => {
        setStatus("success");
        setMessage(res.message);
      })
      .catch((e) => {
        setStatus("error");
        setMessage(e instanceof ApiError ? e.message : "Verification failed. Token may be expired or invalid.");
      });
  }, [token]);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    if (!resendEmail) return;
    setResending(true);
    setResendMsg("");
    try {
      const res = await resendVerification(resendEmail);
      setResendMsg(res.message);
    } catch (err) {
      setResendMsg(err instanceof ApiError ? err.message : "Failed to resend. Try again.");
    } finally {
      setResending(false);
    }
  }

  if (status === "verifying") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        <p className="text-sm text-ink-soft">Verifying your email…</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-emerald-600 text-white">
          <Icon name="check" className="h-5 w-5" />
        </div>
        <h3 className="mt-3 text-sm font-semibold text-emerald-900">Email verified</h3>
        <p className="mt-1 text-sm text-emerald-700">{message}</p>
        <p className="mt-3 text-xs text-emerald-700/80">Our System Admin will review your business shortly. You’ll receive an approval email, then you can sign in as Business Admin.</p>
        <Link href="/login" className="mt-4 inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
        <Icon name="alert" className="h-4 w-4 shrink-0" />
        <span>{message}</span>
      </div>

      <form onSubmit={handleResend} className="rounded-xl border border-border bg-white p-4">
        <p className="text-sm font-medium text-ink">Resend verification email</p>
        <p className="mt-1 text-xs text-ink-soft">Enter the email you registered with.</p>
        <div className="mt-3 flex gap-2">
          <input
            type="email"
            required
            value={resendEmail}
            onChange={(e) => setResendEmail(e.target.value)}
            placeholder="you@company.com"
            className="h-10 flex-1 rounded-lg border border-border px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
          />
          <button disabled={resending} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50">
            {resending ? "..." : "Resend"}
          </button>
        </div>
        {resendMsg && <p className="mt-2 text-xs text-ink-soft">{resendMsg}</p>}
      </form>

      <Link href="/login" className="text-center text-sm text-primary hover:underline">
        Back to sign in
      </Link>
    </div>
  );
}
