"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import Icon from "@/components/ui/Icon";

type Invite = { id: string; org_id: string; email: string | null; role: string; token: string; expires_at: string; accepted_at: string | null; created_at: string };

export default function InvitePanel() {
  const qc = useQueryClient();
  const { data: invites, isLoading } = useQuery<Invite[]>({
    queryKey: ["invites"],
    queryFn: () => apiGet<Invite[]>("/auth/invites"),
  });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("analyst");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Invite | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => apiPost<Invite>("/auth/invite", { email: email || undefined, role }),
    onSuccess: (inv: Invite) => {
      setCreated(inv);
      setEmail("");
      setError(null);
      qc.invalidateQueries({ queryKey: ["invites"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => apiDelete(`/auth/invites/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invites"] }),
  });

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  const signupLink = (token: string) => (typeof window !== "undefined" ? `${window.location.origin}/signup?invite=${token}` : `/signup?invite=${token}`);

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <h3 className="text-sm font-medium text-ink">Invites</h3>
      <p className="mt-1 text-xs text-ink-soft">Invite teammates to this workspace.</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
        className="mt-3 flex flex-col gap-2 sm:flex-row"
      >
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (optional)"
          className="h-9 flex-1 rounded-lg border border-border bg-white px-3 text-sm placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
        />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="h-9 rounded-lg border border-border bg-white px-3 text-sm">
          <option value="analyst">Analyst</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" disabled={create.isPending} className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50">
          {create.isPending ? "..." : "Invite"}
        </button>
      </form>

      {error && <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      {created && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-medium text-emerald-800">Invite created</p>
          <div className="mt-2 flex gap-2">
            <code className="flex-1 break-all rounded bg-white px-2 py-1.5 text-xs">{created.token}</code>
            <button onClick={() => copy(created.token, "t")} className="rounded border bg-white px-2 py-1 text-xs">{copied === "t" ? "Copied" : "Copy"}</button>
          </div>
          <div className="mt-2 flex gap-2">
            <code className="flex-1 break-all rounded bg-white px-2 py-1.5 text-xs">{signupLink(created.token)}</code>
            <button onClick={() => copy(signupLink(created.token), "l")} className="rounded border bg-white px-2 py-1 text-xs">{copied === "l" ? "Copied" : "Copy"}</button>
          </div>
        </div>
      )}

      <div className="mt-4">
        {isLoading ? (
          <div className="py-6 text-center text-xs text-ink-soft">Loading…</div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-bg-soft text-ink-muted">
                <tr>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Expires</th>
                  <th className="px-3 py-2 text-right"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-white">
                {(invites ?? []).map((inv) => {
                  const isExpired = !inv.accepted_at && new Date(inv.expires_at) < new Date();
                  const status = inv.accepted_at ? "Accepted" : isExpired ? "Expired" : "Active";
                  return (
                    <tr key={inv.id}>
                      <td className="px-3 py-2">{inv.email ?? "Open"}</td>
                      <td className="px-3 py-2 capitalize">{inv.role}</td>
                      <td className="px-3 py-2">{status}</td>
                      <td className="px-3 py-2">{new Date(inv.expires_at).toLocaleDateString()}</td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => copy(inv.token, inv.id)} className="px-2 py-1 text-xs text-ink-soft hover:text-ink">{copied === inv.id ? "Copied" : "Copy"}</button>
                        {!inv.accepted_at && <button onClick={() => revoke.mutate(inv.id)} className="px-2 py-1 text-xs text-red-600 hover:underline">Revoke</button>}
                      </td>
                    </tr>
                  );
                })}
                {(!invites || invites.length === 0) && <tr><td colSpan={5} className="px-3 py-6 text-center text-ink-soft">No invites yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
