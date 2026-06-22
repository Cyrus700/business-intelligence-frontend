"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setSession, nameFromEmail } from "@/lib/auth";
import Field from "./Field";
import SocialButtons from "./SocialButtons";
import Icon from "@/components/ui/Icon";

export default function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "");
    setLoading(true);
    // Mock auth — accept any credentials and start a local session.
    setTimeout(() => {
      setSession({ email, name: nameFromEmail(email) });
      router.push("/dashboard");
    }, 700);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <SocialButtons />
      <Field label="Email" type="email" name="email" placeholder="you@company.com" autoComplete="email" />
      <div>
        <Field label="Password" type="password" name="password" placeholder="••••••••" autoComplete="current-password" />
        <div className="mt-2 flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" name="remember" className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30" />
            Remember me
          </label>
          <Link href="/forgot-password" className="text-sm font-medium text-primary hover:text-primary-600">
            Forgot password?
          </Link>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-white shadow-lift transition-all hover:bg-primary-600 active:scale-[0.99] disabled:opacity-70"
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : (
          <>
            Sign in
            <Icon name="arrow" className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
}
