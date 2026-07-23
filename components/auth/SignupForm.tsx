"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import Field from "./Field";
import SocialButtons from "./SocialButtons";
import Icon from "@/components/ui/Icon";

export default function SignupForm() {
  const router = useRouter();
  const { signup } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "");
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      await signup(email, password, name || null);
      router.push("/dashboard");
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

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <SocialButtons />

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-warn/30 bg-warn-50 px-4 py-3 text-sm text-warn">
          <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Field label="Full name" name="name" placeholder="Sairash Budhathoki" autoComplete="name" />
      <Field label="Work email" type="email" name="email" placeholder="you@company.com" autoComplete="email" />
      <Field label="Password" type="password" name="password" placeholder="At least 8 characters" autoComplete="new-password" />

      <label className="flex items-start gap-2.5 text-sm text-ink-soft">
        <input type="checkbox" required className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/30" />
        <span>
          I agree to the <a href="#" className="font-medium text-primary">Terms</a> and{" "}
          <a href="#" className="font-medium text-primary">Privacy Policy</a>.
        </span>
      </label>

      <button
        type="submit"
        disabled={loading}
        className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-white shadow-lift transition-all hover:bg-primary-600 active:scale-[0.99] disabled:opacity-70"
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : (
          <>
            Create account
            <Icon name="arrow" className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
}
