"use client";

import Link from "next/link";
import { hasMinRole, useCan, useDashboardBase, useRole } from "@/lib/use-role";
import { getRoleInfo, type Permission, type Role } from "@/lib/permissions";
import { useMyAccess } from "@/lib/rbac";
import Icon from "@/components/ui/Icon";

type RequireAccessProps = {
  /** Permission from the live RBAC matrix; falls back to shipped defaults. */
  permission?: Permission;
  /** Built-in role floor (analyst < manager < admin). */
  minRole?: Role;
  /** Page label shown on the denied screen. */
  label: string;
  children: React.ReactNode;
};

/**
 * Route-level RBAC gate. Used on top of RequireAuth, so the user is already
 * signed in here — this layer decides whether *this* route is theirs.
 *
 * Denied users get a 403 screen that names their role and the permission
 * they'd need, instead of a silent redirect that lands them in a loop.
 */
export default function RequireAccess({ permission, minRole, label, children }: RequireAccessProps) {
  const role = useRole();
  const canUse = useCan(permission);
  const { isLoading } = useMyAccess();
  const base = useDashboardBase();

  const can = canUse;
  const meetsRole = !minRole || hasMinRole(role, minRole);

  if (isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <div className="flex flex-col items-center gap-3 text-ink-soft">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <span className="text-sm">Checking your access…</span>
        </div>
      </div>
    );
  }

  if (can && meetsRole) return <>{children}</>;

  const roleInfo = getRoleInfo(role);

  return (
    <div className="grid min-h-[55vh] place-items-center py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 text-center shadow-lg">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-warn/10 text-2xl">
          🔒
        </div>
        <h2 className="mt-4 text-xl font-semibold text-ink">Access restricted</h2>
        <p className="mt-1 text-sm text-ink-soft">
          The <span className="font-medium text-ink">{label}</span> section isn&apos;t part of your
          current access level.
        </p>

        <dl className="mt-6 space-y-2 rounded-xl bg-bg-soft p-4 text-left text-sm">
          {role && roleInfo && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">Your role</dt>
              <dd>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${roleInfo.color}`}
                >
                  {roleInfo.title}
                </span>
              </dd>
            </div>
          )}
          {permission && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">Required</dt>
              <dd className="text-right">
                <span className="font-mono text-xs font-semibold text-ink">{permission}</span>
              </dd>
            </div>
          )}
          {minRole && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">Minimum role</dt>
              <dd className="font-mono text-xs font-semibold text-ink capitalize">{minRole}</dd>
            </div>
          )}
        </dl>

        <div className="mt-6 flex items-center justify-center gap-2">
          <Link
            href={base}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            <Icon name="grid" className="h-4 w-4" />
            Back to overview
          </Link>
          <Link
            href={`${base}/permissions`}
            className="inline-flex h-9 items-center rounded-lg border border-border px-4 text-sm font-medium text-ink-soft transition-colors hover:bg-bg-soft"
          >
            See roles & permissions
          </Link>
        </div>

        <p className="mt-4 text-xs text-ink-muted">
          Ask an admin to grant <span className="font-mono font-semibold">{permission ?? "this access"}</span>{" "}
          to your role if you need it.
        </p>
      </div>
    </div>
  );
}