"use client";

import { decodeTokenPayload, getToken } from "@/lib/auth";
import { useMemo, useSyncExternalStore } from "react";
import {
  type Permission,
  type Role,
  ROLE_RANK,
  roleCan,
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
export function useCan(permission: Permission): boolean {
  return usePermissions().includes(permission);
}

export function hasMinRole(userRole: Role | null, minimum: Role): boolean {
  if (!userRole) return false;
  return ROLE_RANK[userRole] >= ROLE_RANK[minimum];
}

export { roleCan as can };
