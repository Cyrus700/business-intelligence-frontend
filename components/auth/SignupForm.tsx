"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setSession } from "@/lib/auth";
import Field from "./Field";
import SocialButtons from "./SocialButtons";
import Icon from "@/components/ui/Icon";

export default function SignupForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "");
    const email = String(data.get("email") ?? "");
    setLoading(true);
    setTimeout(() => {
      setSession({ email, name: name || "there" });
      router.push("/dashboard");
    }, 700);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <SocialButtons />
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
