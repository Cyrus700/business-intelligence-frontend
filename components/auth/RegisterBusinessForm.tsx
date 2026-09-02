"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { dashboardPath } from "@/lib/permissions";
import Field from "./Field";
import Icon from "@/components/ui/Icon";

export default function RegisterBusinessForm() {
  const router = useRouter();
  const { registerOrg } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ orgName: string; status: string; message?: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const data = new FormData(e.currentTarget);
    const orgName = String(data.get("org_name") ?? "").trim();
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    if (!orgName || !email || !password) {
      setError("Please fill in all required fields.");
      return;
    }
    if (orgName.length < 2) {
      setError("Business name must be at least 2 characters.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await registerOrg(orgName, email, password, name || null);
      if (res.status === "approved" && res.user) {
        setSuccess({ orgName, status: "approved" });
        setTimeout(() => router.push(dashboardPath(res.user!.role)), 900);
      } else {
        setSuccess({ orgName, status: "pending", message: res.message ?? undefined });
      }
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    if (success.status === "pending") {
      return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
          <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-amber-500 text-white">⏳</div>
          <h3 className="mt-3 text-[15px] font-semibold text-amber-900">Request received</h3>
          <p className="mt-1 text-sm font-medium text-amber-800">{success.orgName}</p>
          <p className="mt-2 text-sm leading-relaxed text-amber-700">
            We’ve sent a verification email. Please verify your email, then our System Admin will review your business (usually within 24h). You’ll receive an email once approved.
          </p>
          {success.message && <p className="mt-2 text-xs text-amber-700/80">{success.message}</p>}
          <div className="mt-4 rounded-xl bg-white p-3 text-left text-xs">
            <p className="font-medium text-ink">What happens next?</p>
            <ol className="mt-1.5 space-y-1 list-decimal pl-4 text-ink-soft">
              <li>Click the verification link in your email (valid 24h).</li>
              <li>System Admin reviews your business.</li>
              <li>Approval email → you can sign in as Business Admin.</li>
            </ol>
          </div>
          <a href="/login" className="mt-4 inline-flex text-sm font-medium text-amber-700 underline">Back to sign in</a>
        </div>
      );
    }
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-emerald-600 text-white">
          <Icon name="check" className="h-5 w-5" />
        </div>
        <h3 className="mt-3 text-[15px] font-semibold text-emerald-900">Business created</h3>
        <p className="mt-1 text-sm text-emerald-700">{success.orgName} — redirecting…</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
          <Icon name="alert" className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Field label="Business name" name="org_name" placeholder="Acme Pvt. Ltd." autoComplete="organization" />
      <Field label="Your name" name="name" placeholder="Sairash Budhathoki" autoComplete="name" required={false} />
      <Field label="Work email" type="email" name="email" placeholder="you@company.com" autoComplete="email" />
      <Field label="Password" type="password" name="password" placeholder="At least 8 characters" autoComplete="new-password" />

      <p className="text-xs leading-relaxed text-ink-soft">
        You’ll be <span className="font-medium text-ink">Business Admin</span> — you can add Managers & Analysts from your dashboard after.
      </p>

      <label className="flex items-center gap-2 text-xs text-ink-soft">
        <input type="checkbox" required className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/20" />
        <span>
          I agree to the <a href="#" className="font-medium text-primary hover:underline">Terms</a> and <a href="#" className="font-medium text-primary hover:underline">Privacy Policy</a>
        </span>
      </label>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-white transition hover:bg-primary-600 active:scale-[0.98] disabled:opacity-60"
      >
        {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <>Create business <Icon name="arrow" className="h-4 w-4" /></>}
      </button>
    </form>
  );
}
