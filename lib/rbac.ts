// Client for the admin-managed RBAC catalog (backend: app/api/v1/rbac.py).
//
// The role/permission matrix is data now, not a constant: `lib/permissions.ts`
// keeps the shipped defaults purely as an offline fallback so the dashboard
// still renders (and still gates) if the API is unreachable.

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPatch, apiPost, apiPut, queryKeys } from "@/lib/api";
import {
  PERMISSIONS,
  PERMISSION_GROUPS,
  ROLE_DESCRIPTIONS,
  ROLE_RANK,
  type Permission,
} from "@/lib/permissions";

export type RbacRole = {
  id: string;
  name: string;
  label: string;
  description: string | null;
  rank: number;
  color: string;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  permissions: string[];
  user_count: number;
  /** Grants the API refuses to revoke — rendered as a locked checkbox. */
  locked_permissions: string[];
};

export type RbacPermission = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  group_label: string;
  sort_order: number;
  is_system: boolean;
  granted_to: string[];
};

export type RbacMatrix = {
  roles: RbacRole[];
  permissions: RbacPermission[];
  groups: string[];
  matrix: Record<string, string[]>;
  updated_at: string | null;
};

export type MyAccess = {
  role: string | null;
  rank: number;
  label: string | null;
  permissions: string[];
};

export type RbacAuditEntry = {
  id: string;
  action: string;
  entity: string | null;
  entity_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
  actor_email: string | null;
};

export type GrantChange = { role: string; permission: string; granted: boolean };

export type RoleCreateBody = {
  name: string;
  label: string;
  description?: string | null;
  rank: number;
  color?: string;
  is_active?: boolean;
  permissions?: string[];
  clone_from?: string | null;
};

export type RoleUpdateBody = {
  label?: string;
  description?: string | null;
  rank?: number;
  color?: string;
  is_active?: boolean;
};

export type PermissionCreateBody = {
  key: string;
  label: string;
  description?: string | null;
  group_label?: string;
  sort_order?: number;
};

export type PermissionUpdateBody = Partial<Omit<PermissionCreateBody, "key">>;

// ── offline fallback ──────────────────────────────────────────────
// Mirrors the seed in app/core/rbac_defaults.py so a failed /rbac/matrix
// request degrades to the shipped policy instead of an empty screen.

const PERMISSION_META = new Map(
  PERMISSION_GROUPS.flatMap((g) =>
    g.permissions.map((p, i) => [p.key, { ...p, group: g.label, order: i }] as const),
  ),
);

export function fallbackMatrix(): RbacMatrix {
  const now = new Date(0).toISOString();
  const roles: RbacRole[] = (Object.keys(ROLE_RANK) as Array<keyof typeof ROLE_RANK>).map(
    (name) => ({
      id: `fallback-${name}`,
      name,
      label: ROLE_DESCRIPTIONS[name].title,
      description: ROLE_DESCRIPTIONS[name].summary,
      rank: ROLE_RANK[name],
      color: ROLE_DESCRIPTIONS[name].color.includes("purple")
        ? "purple"
        : ROLE_DESCRIPTIONS[name].color.includes("blue")
          ? "blue"
          : "green",
      is_system: true,
      is_active: true,
      created_at: now,
      updated_at: now,
      permissions: PERMISSIONS[name],
      user_count: 0,
      locked_permissions: name === "admin" ? ["users:manage"] : [],
    }),
  );
  const permissions: RbacPermission[] = PERMISSION_GROUPS.flatMap((g) =>
    g.permissions.map((p, i) => ({
      id: `fallback-${p.key}`,
      key: p.key,
      label: p.label,
      description: p.description,
      group_label: g.label,
      sort_order: i,
      is_system: true,
      granted_to: roles.filter((r) => r.permissions.includes(p.key)).map((r) => r.name),
    })),
  );
  return {
    roles: roles.sort((a, b) => a.rank - b.rank),
    permissions,
    groups: PERMISSION_GROUPS.map((g) => g.label),
    matrix: Object.fromEntries(roles.map((r) => [r.name, r.permissions])),
    updated_at: null,
  };
}

export function permissionLabel(key: string): string {
  return PERMISSION_META.get(key)?.label ?? key;
}

// ── queries ───────────────────────────────────────────────────────

export function useRbacMatrix() {
  const query = useQuery<RbacMatrix>({
    queryKey: queryKeys.rbac.matrix(),
    queryFn: () => apiGet<RbacMatrix>("/rbac/matrix"),
    staleTime: 30_000,
  });
  return {
    ...query,
    /** Never null: falls back to the shipped defaults while loading or on error. */
    matrix: query.data ?? fallbackMatrix(),
    isFallback: !query.data,
  };
}

/** The caller's own effective permissions, straight from the server. */
export function useMyAccess() {
  return useQuery<MyAccess>({
    queryKey: queryKeys.rbac.me(),
    queryFn: () => apiGet<MyAccess>("/rbac/me"),
    staleTime: 60_000,
  });
}

export function useRbacAudit(limit = 50, enabled = true) {
  return useQuery<RbacAuditEntry[]>({
    queryKey: queryKeys.rbac.audit(limit),
    queryFn: () => apiGet<RbacAuditEntry[]>("/rbac/audit", { limit }),
    enabled,
    staleTime: 15_000,
  });
}

// ── mutations ─────────────────────────────────────────────────────

function useRbacMutation<TArgs>(fn: (args: TArgs) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.rbac.all });
      // role edits change user counts and assignable roles
      qc.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

export function useSaveMatrix() {
  return useRbacMutation<GrantChange[]>((changes) =>
    apiPatch<RbacMatrix>("/rbac/matrix", { changes }),
  );
}

export function useReplaceRoleGrants() {
  return useRbacMutation<{ role: string; permissions: string[] }>(({ role, permissions }) =>
    apiPut<RbacRole>(`/rbac/roles/${role}/permissions`, { permissions }),
  );
}

export function useCreateRole() {
  return useRbacMutation<RoleCreateBody>((body) => apiPost<RbacRole>("/rbac/roles", body));
}

export function useUpdateRole() {
  return useRbacMutation<{ name: string; body: RoleUpdateBody }>(({ name, body }) =>
    apiPatch<RbacRole>(`/rbac/roles/${name}`, body),
  );
}

export function useDeleteRole() {
  return useRbacMutation<string>((name) => apiDelete(`/rbac/roles/${name}`));
}

export function useCreatePermission() {
  return useRbacMutation<PermissionCreateBody>((body) =>
    apiPost<RbacPermission>("/rbac/permissions", body),
  );
}

export function useUpdatePermission() {
  return useRbacMutation<{ key: string; body: PermissionUpdateBody }>(({ key, body }) =>
    apiPatch<RbacPermission>(`/rbac/permissions/${key}`, body),
  );
}

export function useDeletePermission() {
  return useRbacMutation<string>((key) => apiDelete(`/rbac/permissions/${key}`));
}

export function useResetMatrix() {
  return useRbacMutation<void>(() => apiPost<RbacMatrix>("/rbac/reset", {}));
}

export function useSyncCatalog() {
  return useRbacMutation<void>(() => apiPost<RbacMatrix>("/rbac/sync-catalog", {}));
}

// ── colour tokens ─────────────────────────────────────────────────
// Role colours are admin-chosen names, mapped here so Tailwind can see the
// full class strings at build time (no dynamic `bg-${color}-100`).

export const ROLE_COLORS = [
  "purple",
  "blue",
  "green",
  "amber",
  "rose",
  "cyan",
  "slate",
] as const;

export type RoleColor = (typeof ROLE_COLORS)[number];

const BADGE: Record<string, string> = {
  purple: "bg-purple-100 text-purple-700",
  blue: "bg-blue-100 text-blue-700",
  green: "bg-green-100 text-green-700",
  amber: "bg-amber-100 text-amber-700",
  rose: "bg-rose-100 text-rose-700",
  cyan: "bg-cyan-100 text-cyan-700",
  slate: "bg-slate-100 text-slate-700",
};

const DOT: Record<string, string> = {
  purple: "bg-purple-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  cyan: "bg-cyan-500",
  slate: "bg-slate-400",
};

export function roleBadgeClass(color: string): string {
  return BADGE[color] ?? BADGE.slate;
}

export function roleDotClass(color: string): string {
  return DOT[color] ?? DOT.slate;
}

export type { Permission };
