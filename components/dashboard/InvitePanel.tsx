"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import Icon from "@/components/ui/Icon";
import { clsx } from "@/lib/cx";

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
              <div className="overflow-hidden rounded-xl border border-border bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-bg-soft/60">
                <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                  <th className="px-3 py-2.5" scope="col">Email</th>
                  <th className="px-3 py-2.5" scope="col">Role</th>
                  <th className="px-3 py-2.5" scope="col">Status</th>
                  <th className="px-3 py-2.5" scope="col">Expires</th>
                  <th className="px-3 py-2.5 text-right" scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-white">
                {(invites ?? []).map((inv) => {
                  const isExpired = !inv.accepted_at && new Date(inv.expires_at) < new Date();
                  const isAccepted = !!inv.accepted_at;
                  const status: "Pending" | "Accepted" | "Expired" = isAccepted ? "Accepted" : isExpired ? "Expired" : "Pending";
                  const isPending = status === "Pending";
                  return (
                    <tr key={inv.id} className="group hover:bg-bg-soft/40">
                      <td className="px-3 py-2.5 font-medium text-ink">
                        {inv.email ? (
                          <span className="inline-flex items-center gap-1.5">
                            {inv.email}
                            {isPending && <span className="hidden sm:inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200">invited</span>}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-ink-soft">
                            <span className="inline-flex h-5 items-center rounded-full bg-slate-100 px-2 text-[11px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200">Open invite</span>
                            <span className="text-[11px] text-ink-muted">Anyone with link</span>
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 capitalize text-ink-soft">{inv.role}</td>
                      <td className="px-3 py-2.5">
                        <span
                          title={
                            status === "Pending"
                              ? "Invite sent — awaiting acceptance. User has not joined yet."
                              : status === "Accepted"
                                ? `Accepted on ${new Date(inv.accepted_at!).toLocaleDateString()}`
                                : "Invite expired — send a new one if needed."
                          }
                          className={clsx(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset",
                            status === "Pending" && "bg-amber-50 text-amber-700 ring-amber-200",
                            status === "Accepted" && "bg-green-50 text-green-700 ring-green-200",
                            status === "Expired" && "bg-red-50 text-red-600 ring-red-200",
                          )}
                        >
                          <span
                            className={clsx(
                              "h-1.5 w-1.5 rounded-full",
                              status === "Pending" && "bg-amber-500 animate-pulse",
                              status === "Accepted" && "bg-green-500",
                              status === "Expired" && "bg-red-500",
                            )}
                          />
                          {status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-ink-soft">{new Date(inv.expires_at).toLocaleDateString()}</td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="inline-flex items-center justify-end gap-1">
                          <button
                            onClick={() => copy(inv.token, inv.id)}
                            className="inline-flex h-7 items-center gap-1 rounded-lg border border-transparent px-2.5 text-xs font-medium text-ink-soft hover:border-border hover:bg-white hover:text-ink"
                          >
                            <Icon name="copy" className="h-3.5 w-3.5" />
                            {copied === inv.id ? "Copied" : "Copy link"}
                          </button>
                          {!isAccepted && (
                            <button
                              onClick={() => revoke.mutate(inv.id)}
                              disabled={revoke.isPending}
                              className="inline-flex h-7 items-center rounded-lg px-2.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              Revoke
                            </button>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {(!invites || invites.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-3 py-10 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-bg-soft text-ink-muted">
                          <Icon name="inbox" className="h-4 w-4" />
                        </span>
                        <p className="text-xs font-medium text-ink-soft">No invites yet</p>
                        <p className="text-[11px] text-ink-muted">Invite teammates by email or create an open link.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
