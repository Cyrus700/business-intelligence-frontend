"use client";

import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import Icon from "@/components/ui/Icon";
import { clsx } from "@/lib/cx";
import { useRole, hasMinRole } from "@/lib/use-role";
import {
  type Role,
  ROLE_RANK,
  PERMISSION_GROUPS,
  PERMISSIONS,
  ROLE_DESCRIPTIONS,
} from "@/lib/permissions";

const ROLES: Role[] = ["analyst", "manager", "admin"];

function RoleCard({ role, current }: { role: Role; current: Role | null }) {
  const info = ROLE_DESCRIPTIONS[role];
  const rank = ROLE_RANK[role];
  const isCurrent = role === current;
  const isAbove = current ? rank > ROLE_RANK[current] : false;

  return (
    <div
      className={clsx(
        "rounded-xl border p-5 transition-all",
        isCurrent
          ? "border-primary ring-2 ring-primary/20"
          : "border-border",
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={clsx(
            "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize",
            info.color,
            isCurrent && "ring-2 ring-primary/30",
          )}
        >
          {info.title}
        </span>
        {isCurrent && (
          <span className="flex items-center gap-1 text-xs font-medium text-primary">
            <Icon name="check" className="h-3.5 w-3.5" />
            Your role
          </span>
        )}
        {isAbove && (
          <span className="text-xs text-ink-muted">
            {rank - (current ? ROLE_RANK[current] : 0)} level{rank - (current ? ROLE_RANK[current] : 0) > 1 ? "s" : ""} above
          </span>
        )}
      </div>
      <p className="mt-3 text-sm text-ink-soft">{info.summary}</p>

      <ul className="mt-4 space-y-1.5">
        {PERMISSIONS[role].slice(0, 6).map((p) => (
          <li key={p} className="flex items-center gap-2 text-xs text-ink-soft">
            <Icon name="check" className="h-3 w-3 shrink-0 text-green-500" />
            {p}
          </li>
        ))}
        {PERMISSIONS[role].length > 6 && (
          <li className="pt-1 text-xs font-medium text-primary">
            +{PERMISSIONS[role].length - 6} more permissions
          </li>
        )}
      </ul>
    </div>
  );
}

function PermissionTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs font-semibold uppercase text-ink-muted">
            <th className="px-3 py-3">Permission</th>
            <th className="px-3 py-3 text-center">Analyst</th>
            <th className="px-3 py-3 text-center">Manager</th>
            <th className="px-3 py-3 text-center">Admin</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {PERMISSION_GROUPS.map((group) => (
            <>
              <tr key={group.label} className="bg-bg-soft/50">
                <td
                  colSpan={4}
                  className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-ink-muted"
                >
                  {group.label}
                </td>
              </tr>
              {group.permissions.map((perm) => (
                <tr key={perm.key} className="hover:bg-bg-soft/50">
                  <td className="px-3 py-3">
                    <span className="font-medium text-ink">{perm.label}</span>
                    <p className="text-xs text-ink-muted">{perm.description}</p>
                  </td>
                  {ROLES.map((role) => {
                    const has = (PERMISSIONS[role] as string[]).includes(perm.key);
                    return (
                      <td key={role} className="px-3 py-3 text-center">
                        {has ? (
                          <Icon name="check" className="mx-auto h-4 w-4 text-green-500" />
                        ) : (
                          <span className="text-ink-muted">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RoleComparison() {
  const current = useRole();
  const canManage = hasMinRole(current, "admin");

  return (
    <>
      <PageHeader
        title="Roles & Permissions"
        subtitle="Compare capabilities across roles and understand access levels."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {ROLES.map((role) => (
          <RoleCard key={role} role={role} current={current} />
        ))}
      </div>

      <div className="mt-6">
        <Panel title="Full permission matrix" subtitle="Every capability by role">
          <PermissionTable />
        </Panel>
      </div>

      {canManage && (
        <div className="mt-6 rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-purple-500/5 p-6">
          <div className="flex items-start gap-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-white">
              <Icon name="shield" className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-semibold text-ink">Admin access</h3>
              <p className="mt-1 text-sm text-ink-soft">
                You have full platform control. Visit the{" "}
                <a href="/dashboard/users" className="font-medium text-primary hover:underline">
                  Users
                </a>{" "}
                page to manage user roles and access.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function PermissionsClient() {
  return <RoleComparison />;
}
