"use client";

import { useMemo, useState } from "react";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import Icon from "@/components/ui/Icon";
import { clsx } from "@/lib/cx";
import { ErrorBoundary } from "@/lib/error-boundary";
import { useRole } from "@/lib/use-role";
import { roleBadgeClass, useMyAccess, useRbacMatrix } from "@/lib/rbac";
import MatrixEditor from "./MatrixEditor";
import PermissionsCatalog from "./PermissionsCatalog";
import RbacActivity from "./RbacActivity";
import RolesManager from "./RolesManager";
import { Spinner, inputClass } from "./ui";

const TABS = [
  { id: "matrix", label: "Matrix", icon: "grid" },
  { id: "roles", label: "Roles", icon: "users" },
  { id: "permissions", label: "Permissions", icon: "lock" },
  { id: "activity", label: "Activity", icon: "pipe" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function AccessConsole() {
  const currentRole = useRole();
  const { matrix, isLoading, error, isFallback } = useRbacMatrix();
  const { data: access } = useMyAccess();
  const [tab, setTab] = useState<TabId>("matrix");

  // Authority comes from the server's own view of the caller's grants — the
  // JWT role is only a hint, since an admin may have re-delegated roles:manage.
  const canManage = access?.permissions.includes("roles:manage") ?? false;

  const visibleTabs = useMemo(
    () => (canManage ? TABS : TABS.filter((t) => t.id !== "activity")),
    [canManage],
  );

  if (isLoading && isFallback) {
    return (
      <>
        <PageHeader title="Roles & Permissions" />
        <Panel>
          <Spinner label="Loading access policy…" />
        </Panel>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Roles & Permissions"
        subtitle={
          canManage
            ? "Define roles, edit the permission matrix and audit every change. Saved changes take effect immediately."
            : "Compare capabilities across roles and understand your access level."
        }
        action={
          access?.role && (
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-ink-soft shadow-card">
              <Icon name="shield" className="h-3.5 w-3.5 text-primary" />
              You are{" "}
              <span
                className={clsx(
                  "rounded-full px-2 py-0.5 font-semibold",
                  roleBadgeClass(
                    matrix.roles.find((r) => r.name === access.role)?.color ?? "slate",
                  ),
                )}
              >
                {access.label ?? access.role}
              </span>
              · {access.permissions.length} permissions
            </span>
          )
        }
      />

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-warn-50 px-4 py-3 text-sm text-warn">
          <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Could not load the live policy ({error instanceof Error ? error.message : "unknown error"}
            ). Showing the defaults this build ships with — edits are disabled until the API
            responds.
          </span>
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-1 rounded-xl border border-border bg-white p-1 shadow-card">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id}
            className={clsx(
              "inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:flex-none",
              tab === t.id
                ? "bg-primary text-white shadow-lift"
                : "text-ink-soft hover:bg-bg-soft hover:text-ink",
            )}
          >
            <Icon name={t.icon} className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "matrix" && (
        <MatrixEditor
          matrix={matrix}
          canManage={canManage && !isFallback}
          currentRole={currentRole}
        />
      )}
      {tab === "roles" && (
        <>
          <RolesManager
            matrix={matrix}
            canManage={canManage && !isFallback}
            currentRole={currentRole}
          />
          <div className="mt-6">
            <AccessSimulator matrix={matrix} />
          </div>
        </>
      )}
      {tab === "permissions" && (
        <PermissionsCatalog matrix={matrix} canManage={canManage && !isFallback} />
      )}
      {tab === "activity" && canManage && <RbacActivity enabled={tab === "activity"} />}

      {!canManage && (
        <div className="mt-6 rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-purple-500/5 p-6">
          <div className="flex items-start gap-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-white">
              <Icon name="lock" className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-semibold text-ink">Read-only view</h3>
              <p className="mt-1 text-sm text-ink-soft">
                Editing roles and permissions needs the{" "}
                <code className="font-mono text-xs">roles:manage</code> permission. Ask an
                administrator if you need it.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** "If I gave someone this role, what could they do?" — answered from the matrix. */
function AccessSimulator({ matrix }: { matrix: ReturnType<typeof useRbacMatrix>["matrix"] }) {
  const [role, setRole] = useState(matrix.roles[0]?.name ?? "");
  const selected = matrix.roles.find((r) => r.name === role);
  const granted = useMemo(() => new Set(selected?.permissions ?? []), [selected]);

  const byGroup = useMemo(() => {
    const map = new Map<string, { key: string; label: string; allowed: boolean }[]>();
    for (const p of matrix.permissions) {
      const list = map.get(p.group_label) ?? [];
      list.push({ key: p.key, label: p.label, allowed: granted.has(p.key) });
      map.set(p.group_label, list);
    }
    return [...map.entries()];
  }, [matrix.permissions, granted]);

  return (
    <Panel
      title="Access simulator"
      subtitle="Preview exactly what a role can reach before you assign it to anyone."
      action={
        <select
          aria-label="Simulate role"
          className={clsx(inputClass, "h-10 w-48")}
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          {matrix.roles.map((r) => (
            <option key={r.name} value={r.name}>
              {r.label}
            </option>
          ))}
        </select>
      }
    >
      <p className="mb-4 text-sm text-ink-soft">
        <strong>{selected?.label}</strong> can use {granted.size} of {matrix.permissions.length}{" "}
        capabilities.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {byGroup.map(([group, items]) => (
          <div key={group} className="rounded-xl border border-border p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              {group}
            </h4>
            <ul className="mt-2 space-y-1">
              {items.map((item) => (
                <li
                  key={item.key}
                  className={clsx(
                    "flex items-center gap-2 text-xs",
                    item.allowed ? "text-ink-soft" : "text-ink-muted line-through opacity-60",
                  )}
                >
                  <Icon
                    name={item.allowed ? "check" : "close"}
                    className={clsx(
                      "h-3 w-3 shrink-0",
                      item.allowed ? "text-green-500" : "text-ink-muted",
                    )}
                  />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export default function PermissionsClient() {
  return (
    <ErrorBoundary
      fallback={(error: Error) => (
        <>
          <PageHeader title="Roles & Permissions" />
          <Panel>
            <div className="rounded-xl bg-warn-50 px-5 py-4 text-sm text-warn">
              {error.message}
            </div>
          </Panel>
        </>
      )}
    >
      <AccessConsole />
    </ErrorBoundary>
  );
}
