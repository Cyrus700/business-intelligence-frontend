"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import Icon from "@/components/ui/Icon";

type Org = { id: string; name: string; slug: string | null; status: string; created_at: string; contact_email?: string | null; contact_name?: string | null };

export default function PendingApprovals() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery<Org[]>({
    queryKey: ["admin-pending-orgs"],
    queryFn: () => apiGet<Org[]>("/auth/admin/pending-organizations"),
  });

  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [actionMsg, setActionMsg] = useState("");

  const approve = useMutation({
    mutationFn: (id: string) => apiPost(`/auth/admin/organizations/${id}/approve`, {}),
    onSuccess: () => {
      setActionMsg("Business approved — approval email sent.");
      qc.invalidateQueries({ queryKey: ["admin-pending-orgs"] });
    },
    onError: (e: any) => setActionMsg(e.message || "Approve failed"),
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => apiPost(`/auth/admin/organizations/${id}/reject`, { reason }),
    onSuccess: () => {
      setActionMsg("Business rejected — notification sent.");
      setRejectId(null);
      setReason("");
      qc.invalidateQueries({ queryKey: ["admin-pending-orgs"] });
    },
    onError: (e: any) => setActionMsg(e.message || "Reject failed"),
  });

  if (isLoading) return <div className="py-6 text-center text-sm text-ink-soft">Loading pending businesses…</div>;
  if (error) return <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{String((error as any).message || "Failed to load")}</div>;

  const pending = data ?? [];

  return (
    <div className="rounded-xl border border-border bg-white">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h3 className="text-sm font-medium text-ink">Pending businesses</h3>
          <p className="text-xs text-ink-soft">System Admin — approve to activate Business Admin.</p>
        </div>
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">{pending.length} pending</span>
      </div>

      {actionMsg && <div className="mx-4 mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{actionMsg}</div>}

      {pending.length === 0 ? (
        <div className="p-8 text-center">
          <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <Icon name="check" className="h-5 w-5" />
          </div>
          <p className="mt-2 text-sm font-medium text-ink">No pending businesses</p>
          <p className="text-xs text-ink-soft">New registrations will appear here.</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {pending.map((org) => (
            <div key={org.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink truncate">{org.name}</p>
                <p className="text-xs text-ink-soft">
                  {org.contact_name ?? "—"} {org.contact_email ? `· ${org.contact_email}` : ""} · {new Date(org.created_at).toLocaleString()}
                </p>
                <p className="text-xs text-ink-muted">{org.slug ?? "—"} · ID: {org.id.slice(0, 8)}…</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => approve.mutate(org.id)}
                  disabled={approve.isPending}
                  className="inline-flex h-8 items-center rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {approve.isPending ? "..." : "Approve"}
                </button>
                <button
                  onClick={() => setRejectId(org.id)}
                  className="inline-flex h-8 items-center rounded-lg border border-border bg-white px-3 text-sm font-medium text-ink hover:bg-bg-soft"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {rejectId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lift">
            <h4 className="text-sm font-semibold text-ink">Reject business</h4>
            <p className="mt-1 text-xs text-ink-soft">Provide a reason — business admin will be emailed.</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (optional)"
              className="mt-3 min-h-[80px] w-full rounded-lg border border-border p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setRejectId(null)} className="rounded-lg border border-border px-4 py-2 text-sm">
                Cancel
              </button>
              <button
                onClick={() => reject.mutate({ id: rejectId, reason: reason || undefined })}
                disabled={reject.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {reject.isPending ? "..." : "Reject & notify"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
