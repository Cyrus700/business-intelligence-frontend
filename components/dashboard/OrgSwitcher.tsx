"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type Org = { id: string; name: string; slug: string | null; is_legacy: boolean };

export default function OrgSwitcher() {
  const { user } = useAuth();
  // Only super-admin sees switcher
  if (!user?.is_super_admin) return null;

  const { data } = useQuery<Org[]>({
    queryKey: ["orgs"],
    queryFn: () => apiGet<Org[]>("/auth/organizations"),
  });

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
