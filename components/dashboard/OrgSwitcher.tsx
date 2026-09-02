"use client";

import { useOrganizations } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function OrgSwitcher() {
  const { user } = useAuth();
  const isSuperAdmin = !!user?.is_super_admin;
  // Shared query key with the topbar/overview, and gated so non-super-admins
  // never trigger the request. The hook must run unconditionally — an early
  // return above it would break the rules of hooks when `user` resolves.
  const { data } = useOrganizations(isSuperAdmin);

  if (!isSuperAdmin) return null;
  if (!data || data.length <= 1) return null;

  return (
    <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
      <span className="text-xs font-semibold text-amber-800">Super-admin</span>
      <select
        className="h-8 rounded-lg border border-amber-300 bg-white px-2 text-xs"
        value={user.org_id ?? ""}
        onChange={(e) => {
          // For now just show selection — full org-switch requires re-auth/JWT rotation.
          // This dropdown is read-only visibility; actual switching can be done via API header X-Org-Id in future.
          alert(`Org switcher: selected ${e.target.value}. Full switching requires JWT rotation — coming soon. Your current org remains ${user.org_id}`);
        }}
      >
        {data.map((o) => (
          <option key={o.id} value={o.id}>{o.name}{o.is_legacy ? " (legacy)" : ""}</option>
        ))}
      </select>
      <span className="text-[11px] text-amber-700">You see all orgs.</span>
    </div>
  );
}
