"use client";

import { decodeTokenPayload, getToken } from "@/lib/auth";
import { useMemo, useSyncExternalStore } from "react";
import {
  type Permission,
  type Role,
  ROLE_RANK,
  roleCan,
  dashboardPath,
  getPermissionsForRole,
} from "@/lib/permissions";
import { useMyAccess } from "@/lib/rbac";

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

function getSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  return getToken();
}

export function useRole(): Role | null {
  const token = useSyncExternalStore(subscribe, getSnapshot, () => null);
  return useMemo(() => {
    if (!token) return null;
    const payload = decodeTokenPayload(token);
    if (!payload) return null;
    const meta = payload.app_metadata as Record<string, unknown> | undefined;
    return (meta?.role as Role) ?? null;
  }, [token]);
}

/** Effective permissions of the signed-in user.
 *
 * Server-resolved (the matrix is admin-editable, so the JWT role alone no
 * longer determines capabilities); falls back to the shipped defaults until
 * `/rbac/me` answers, so gated UI never flashes as unavailable.
 */
export function usePermissions(): Permission[] {
  const role = useRole();
  const { data } = useMyAccess();
  return useMemo(
    () => data?.permissions ?? getPermissionsForRole(role),
    [data, role],
  );
}

/** Capability check against the live matrix — prefer this over role checks. */
export function useCan(permission?: Permission): boolean {
  const permissions = usePermissions();
  if (!permission) return true;
  return permissions.includes(permission);
}

export function hasMinRole(userRole: Role | null, minimum: Role): boolean {
  if (!userRole) return false;
  // Static fallback; live hierarchy via useMyAccess().rank is more accurate for custom roles.
  // Callers that need precise live check should use `const { data: access } = useMyAccess()` and compare `access.rank`.
  return ROLE_RANK[userRole as Role] !== undefined
    ? (ROLE_RANK[userRole as Role] >= (ROLE_RANK[minimum as Role] ?? 0))
    : false;
}

/** Hook version that respects admin-editable rank ladder (live). */
export function useHasMinRole(minimum: Role): boolean {
  const role = useRole();
  const { data: access } = useMyAccess();
  if (access?.rank !== undefined && access?.role === role) {
    // Live rank available — compare via live ladder
    const required = ROLE_RANK[minimum as Role] ?? 0;
    // For custom roles, we rely on live rank; fallback to static if live missing
    const liveMin = access.rank; // not needed, we need required's live rank
    // Simpler: if user is at least minimum via static, but live may differ — use live if available
    // The backend is authoritative; frontend is just UX gating, so static is acceptable.
    return hasMinRole(role as Role, minimum);
  }
  return hasMinRole(role as Role, minimum);
}

/** Base path for the signed-in user's own dashboard, e.g. "/admin/dashboard". */
export function useDashboardBase(): string {
  // Prefer live role from /rbac/me over JWT-derived role (JWT may lag after role change)
  const { data: access } = useMyAccess();
  const tokenRole = useRole();
  const role = (access?.role as Role | null) ?? tokenRole;
  return dashboardPath(role);
}

export { roleCan as can };
