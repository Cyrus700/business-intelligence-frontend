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

export function usePermissions(): Permission[] {
  const role = useRole();
  return useMemo(() => getPermissionsForRole(role), [role]);
}

export function hasMinRole(userRole: Role | null, minimum: Role): boolean {
  if (!userRole) return false;
  return ROLE_RANK[userRole] >= ROLE_RANK[minimum];
}

export { roleCan as can };
