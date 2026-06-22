import type { Metadata } from "next";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import LogoutButton from "@/components/dashboard/LogoutButton";

export const metadata: Metadata = { title: "Settings · Insightful" };

function Toggle({ label, desc, on = false }: { label: string; desc: string; on?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="block text-sm text-ink-soft">{desc}</span>
      </span>
      <span className="relative inline-flex">
        <input type="checkbox" defaultChecked={on} className="peer sr-only" />
        <span className="h-6 w-11 rounded-full bg-border transition-colors peer-checked:bg-primary" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

const inputCls =
  "h-11 w-full rounded-xl border border-border bg-white px-3.5 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10";

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" subtitle="Manage your profile, plan and security." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel title="Profile">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink">Full name</span>
                <input className={inputCls} defaultValue="Sairash Budhathoki" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink">Email</span>
                <input className={inputCls} defaultValue="you@company.com" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink">Company</span>
                <input className={inputCls} defaultValue="Insightful Inc." />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink">Role</span>
                <input className={inputCls} defaultValue="Business Manager" />
              </label>
            </div>
            <div className="mt-5 flex justify-end">
              <button className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-white shadow-lift hover:bg-primary-600">
                Save changes
              </button>
            </div>
          </Panel>

          <Panel title="Security" bodyClassName="divide-y divide-border">
            <Toggle label="Two-factor authentication" desc="Add an extra layer of security at sign in." on />
            <Toggle label="Anomaly email alerts" desc="Get notified when unusual activity is detected." on />
            <Toggle label="Weekly digest" desc="A summary of key metrics every Monday." />
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Plan">
            <div className="rounded-xl bg-gradient-to-br from-primary to-[#8b5cf6] p-4 text-white">
              <p className="text-sm font-semibold">Growth</p>
              <p className="mt-1 font-mono text-2xl font-semibold">$29<span className="text-sm">/mo</span></p>
              <p className="mt-1 text-xs text-white/80">Renews Oct 1, 2026</p>
            </div>
            <button className="mt-4 w-full rounded-xl border border-border py-2.5 text-sm font-medium text-ink hover:bg-bg-soft">
              Manage subscription
            </button>
          </Panel>

          <Panel title="Account">
            <p className="text-sm text-ink-soft">
              Sign out of your account on this device.
            </p>
            <div className="mt-4">
              <LogoutButton />
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
