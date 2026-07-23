"use client";

import Panel from "@/components/dashboard/Panel";
import Icon from "@/components/ui/Icon";
import { clsx } from "@/lib/cx";
import { useRole, hasMinRole } from "@/lib/use-role";
import { ROLE_DESCRIPTIONS, PERMISSIONS, type Role } from "@/lib/permissions";

const UPGRADE_PATH: Record<Role, { from: Role; to: Role; label: string } | null> = {
  analyst: { from: "analyst", to: "manager", label: "Upgrade to Manager" },
  manager: { from: "manager", to: "admin", label: "Upgrade to Admin" },
  admin: null,
};

export default function RoleSection() {
  const role = useRole();
  const roleInfo = role ? ROLE_DESCRIPTIONS[role] : null;
  const upgrade = role ? UPGRADE_PATH[role] : null;

  if (!role || !roleInfo) return null;

  const permissionCount = PERMISSIONS[role]?.length ?? 0;

  return (
    <Panel title="Your Role">
      <div className="text-center">
        <span
          className={clsx(
            "inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold capitalize",
            roleInfo.color,
          )}
        >
          {roleInfo.title}
        </span>

        <p className="mt-3 text-sm text-ink-soft">{roleInfo.summary}</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-bg-soft p-3">
            <p className="text-lg font-semibold text-ink">{permissionCount}</p>
            <p className="text-xs text-ink-muted">Permissions</p>
          </div>
          <div className="rounded-xl bg-bg-soft p-3">
            <p className="text-lg font-semibold text-ink">
              {role === "admin" ? "∞" : hasMinRole(role, "manager") ? "2" : "1"}
            </p>
            <p className="text-xs text-ink-muted">Level</p>
          </div>
        </div>

        {upgrade && (
          <div className="mt-4 rounded-xl bg-gradient-to-br from-primary/5 to-purple-500/5 p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Next level
            </p>
            <p className="mt-1 text-sm font-medium text-ink">{upgrade.label}</p>
            <ul className="mt-2 space-y-1">
              {PERMISSIONS[upgrade.to]
                .filter((p) => !PERMISSIONS[upgrade.from].includes(p))
                .slice(0, 4)
                .map((p) => (
                  <li key={p} className="flex items-center gap-1.5 text-xs text-ink-soft">
                    <Icon name="check" className="h-3 w-3 text-green-500" />
                    {p}
                  </li>
                ))}
            </ul>
            {PERMISSIONS[upgrade.to].length - PERMISSIONS[upgrade.from].length > 4 && (
              <p className="mt-1 text-xs text-primary">
                +{PERMISSIONS[upgrade.to].length - PERMISSIONS[upgrade.from].length - 4} more
              </p>
            )}
            <p className="mt-2 text-xs text-ink-muted">
              Contact your admin to request an upgrade.
            </p>
          </div>
        )}
      </div>
    </Panel>
  );
}
