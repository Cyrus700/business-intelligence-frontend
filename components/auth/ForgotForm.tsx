"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import Field from "./Field";
import Icon from "@/components/ui/Icon";

export default function ForgotForm() {
  const { forgotPassword } = useAuth();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "");

    if (!email) {
      setError("Please enter your email");
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-bg-soft p-8 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-accent-50 text-accent">
          <Icon name="check" className="h-6 w-6" />
        </span>
        <div>
          <p className="font-semibold text-ink">Check your inbox</p>
          <p className="mt-1 text-sm text-ink-soft">
            We&apos;ve sent a reset link if an account exists for that email.
          </p>
        </div>
        <Link href="/login" className="text-sm font-medium text-primary hover:text-primary-600">
          ← Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-warn/30 bg-warn-50 px-4 py-3 text-sm text-warn">
          <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <Field label="Email" type="email" name="email" placeholder="you@company.com" autoComplete="email" />
      <button
        type="submit"
        disabled={loading}
        className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-white shadow-lift transition-all hover:bg-primary-600 active:scale-[0.99] disabled:opacity-70"
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : (
          "Send reset link"
        )}
      </button>
    </form>
  );
}
