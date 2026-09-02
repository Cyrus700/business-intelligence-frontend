"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { dashboardPath } from "@/lib/permissions";
import Field from "./Field";
import SocialButtons from "./SocialButtons";
import Icon from "@/components/ui/Icon";

export default function SignupForm({ next = "", inviteToken = "" }: { next?: string; inviteToken?: string }) {
  const router = useRouter();
  const { signup } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inviteFromQuery = inviteToken;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "");
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    const token = String(data.get("invite_token") ?? inviteFromQuery ?? "").trim();

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const profile = await signup(email, password, name || null, token || null);
      router.push(next || dashboardPath(profile.role));
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <SocialButtons />

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
          <Icon name="alert" className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Field label="Full name" name="name" placeholder="Sairash Budhathoki" autoComplete="name" required={false} />
      <Field label="Work email" type="email" name="email" placeholder="you@company.com" autoComplete="email" />
      <Field label="Password" type="password" name="password" placeholder="At least 8 characters" autoComplete="new-password" />
      <Field label="Invite token" name="invite_token" placeholder="Paste invite token" defaultValue={inviteFromQuery} required={false} />

      <p className="text-xs text-ink-soft">Ask your admin for the token, or switch to Business to create a new workspace.</p>

      <label className="flex items-center gap-2 text-xs text-ink-soft">
        <input type="checkbox" required className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/20" />
        <span>
          I agree to the <a href="#" className="font-medium text-primary hover:underline">Terms</a> and <a href="#" className="font-medium text-primary hover:underline">Privacy Policy</a>
        </span>
      </label>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-ink text-sm font-medium text-white transition hover:bg-ink/90 active:scale-[0.98] disabled:opacity-60"
      >
        {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <>Create account <Icon name="arrow" className="h-4 w-4" /></>}
      </button>
    </form>
  );
}
