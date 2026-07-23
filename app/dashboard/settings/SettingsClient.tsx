"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import LogoutButton from "@/components/dashboard/LogoutButton";
import RoleSection from "@/components/dashboard/role/RoleSection";
import { useAuth } from "@/lib/auth-context";
import { useRole, hasMinRole } from "@/lib/use-role";
import type { UserPreferences } from "@/lib/auth";

const inputCls =
  "h-11 w-full rounded-xl border border-border bg-white px-3.5 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10";

function Toggle({
  label,
  desc,
  on,
  onChange,
}: {
  label: string;
  desc: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="block text-sm text-ink-soft">{desc}</span>
      </span>
      <span className="relative inline-flex" onClick={(e) => { e.preventDefault(); onChange(!on); }}>
        <input type="checkbox" checked={on} readOnly className="peer sr-only" />
        <span className="h-6 w-11 rounded-full transition-colors peer-checked:bg-primary" style={{ backgroundColor: on ? "var(--color-primary, #6366f1)" : "#e5e7eb" }} />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform" style={{ transform: on ? "translateX(1.25rem)" : "none" }} />
      </span>
    </label>
  );
}

export default function SettingsClient() {
  const { user, updateProfile } = useAuth();
  const role = useRole();
  const isAdmin = hasMinRole(role, "admin");

  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const [prefs, setPrefs] = useState<UserPreferences>({
    two_factor: true,
    anomaly_alerts: true,
    weekly_digest: false,
  });
  const [prefsLoading, setPrefsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name ?? "");
      setDepartment(user.department ?? "");
    }
  }, [user]);

  useEffect(() => {
    async function load() {
      try {
        const { getPreferences } = await import("@/lib/auth");
        const p = await getPreferences();
        setPrefs(p);
      } catch {
        // use defaults
      } finally {
        setPrefsLoading(false);
      }
    }
    load();
  }, []);

  async function handleSaveProfile() {
    setSaving(true);
    setSaveMsg("");
    try {
      await updateProfile({ full_name: fullName || null, department: department || null });
      setSaveMsg("Saved");
      setTimeout(() => setSaveMsg(""), 2500);
    } catch {
      setSaveMsg("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(key: keyof UserPreferences, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    try {
      const { updatePreferences: apiUpdate } = await import("@/lib/auth");
      await apiUpdate({ [key]: value });
    } catch {
      setPrefs(prefs);
    }
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Manage your profile, role and security." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel title="Profile">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink">Full name</span>
                <input
                  className={inputCls}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink">Email</span>
                <input
                  className={inputCls}
                  value={user?.email ?? ""}
                  disabled
                  title="Email cannot be changed"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-medium text-ink">Department</span>
                <input
                  className={inputCls}
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Engineering"
                />
              </label>
            </div>
            <div className="mt-5 flex items-center justify-end gap-3">
              {saveMsg && (
                <span className={`text-sm ${saveMsg === "Saved" ? "text-accent" : "text-warn"}`}>
                  {saveMsg}
                </span>
              )}
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-white shadow-lift hover:bg-primary-600 disabled:opacity-70"
              >
                {saving ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  "Save changes"
                )}
              </button>
            </div>
          </Panel>

          <Panel title="Security" bodyClassName="divide-y divide-border">
            <Toggle
              label="Two-factor authentication"
              desc="Add an extra layer of security at sign in."
              on={prefs.two_factor}
              onChange={(v) => handleToggle("two_factor", v)}
            />
            <Toggle
              label="Anomaly email alerts"
              desc="Get notified when unusual activity is detected."
              on={prefs.anomaly_alerts}
              onChange={(v) => handleToggle("anomaly_alerts", v)}
            />
            <Toggle
              label="Weekly digest"
              desc="A summary of key metrics every Monday."
              on={prefs.weekly_digest}
              onChange={(v) => handleToggle("weekly_digest", v)}
            />
          </Panel>
        </div>

        <div className="space-y-4">
          <RoleSection />

          <Panel title="Account">
            <p className="text-sm text-ink-soft">
              Sign out of your account on this device.
            </p>
            <div className="mt-4">
              <LogoutButton />
            </div>
          </Panel>

          {isAdmin && (
            <Panel title="Administration" bodyClassName="space-y-2">
              <a
                href="/dashboard/users"
                className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm font-medium text-ink hover:bg-bg-soft"
              >
                Manage users
              </a>
              <a
                href="/dashboard/permissions"
                className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm font-medium text-ink hover:bg-bg-soft"
              >
                View permissions
              </a>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
