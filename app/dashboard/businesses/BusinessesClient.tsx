"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import { Modal } from "@/components/ui/Modal";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import SearchInput from "@/components/ui/SearchInput";
import Pagination from "@/components/ui/Pagination";
import { clsx } from "@/lib/cx";
import { ErrorBoundary } from "@/lib/error-boundary";
import { useAuth } from "@/lib/auth-context";
import { apiGet, apiPost, queryKeys } from "@/lib/api";
import type { BusinessOut, PaginatedBusinesses, BusinessDetailOut } from "@/lib/api";
import { useDashboardBase } from "@/lib/use-role";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

function StatusBadge({ status }: { status: string }) {
  const variant = STATUS_VARIANT[status] ?? "secondary";
  const label = STATUS_LABEL[status] ?? status;
  return <Badge variant={variant} className="text-xs capitalize">{label}</Badge>;
}

function TypeBadge({ is_personal, is_legacy }: { is_personal: boolean; is_legacy: boolean }) {
  if (is_legacy) return <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">Legacy</span>;
  if (is_personal) return <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">Personal</span>;
  return <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Business</span>;
}

function BusinessDetailModal({
  business,
  onClose,
  onApproved,
  onRejected,
}: {
  business: BusinessOut;
  onClose: () => void;
  onApproved: () => void;
  onRejected: () => void;
}) {
  const queryClient = useQueryClient();
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Fetch full detail (includes latest member_count etc.) — uses list row as fallback
  const { data: detail } = useQuery<BusinessDetailOut>({
    queryKey: queryKeys.businesses.detail(business.id),
    queryFn: () => apiGet<BusinessDetailOut>(`/auth/admin/organizations/${business.id}`),
    initialData: business as unknown as BusinessDetailOut,
  });

  const d = detail ?? (business as unknown as BusinessDetailOut);

  const approveMut = useMutation({
    mutationFn: () => apiPost<BusinessOut>(`/auth/admin/organizations/${business.id}/approve`, {}),
    onSuccess: () => {
      setActionMsg("Business approved — approval email sent.");
      queryClient.invalidateQueries({ queryKey: queryKeys.businesses.all });
      queryClient.invalidateQueries({ queryKey: ["admin-pending-orgs"] });
      onApproved();
    },
    onError: (e: any) => setActionMsg(e.message || "Approve failed"),
  });

  const rejectMut = useMutation({
    mutationFn: () => apiPost<BusinessOut>(`/auth/admin/organizations/${business.id}/reject`, { reason: rejectReason || undefined }),
    onSuccess: () => {
      setActionMsg("Business rejected — notification sent.");
      queryClient.invalidateQueries({ queryKey: queryKeys.businesses.all });
      queryClient.invalidateQueries({ queryKey: ["admin-pending-orgs"] });
      setShowReject(false);
      onRejected();
    },
    onError: (e: any) => setActionMsg(e.message || "Reject failed"),
  });

  return (
    <Modal title={d.name} subtitle={`Business detail · ${d.status}`} onClose={onClose} wide>
      <div className="space-y-5">
        {actionMsg && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{actionMsg}</div>}

        {/* Header badges */}
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={d.status ?? "pending"} />
          <TypeBadge is_personal={!!d.is_personal} is_legacy={!!d.is_legacy} />
          {d.slug && <span className="rounded-full bg-bg-soft px-2.5 py-1 text-xs text-ink-soft">/{d.slug}</span>}
        </div>

        {/* Key facts grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-bg-soft p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Business</p>
            <p className="mt-1 text-sm font-semibold text-ink">{d.name}</p>
            <p className="mt-1 text-xs text-ink-soft">ID: <span className="font-mono">{d.id}</span></p>
            <p className="text-xs text-ink-soft">Slug: {d.slug ?? "—"}</p>
            <p className="text-xs text-ink-soft">Created: {new Date(d.created_at).toLocaleString()}</p>
            {d.updated_at && <p className="text-xs text-ink-soft">Updated: {new Date(d.updated_at).toLocaleString()}</p>}
          </div>
          <div className="rounded-xl border border-border bg-bg-soft p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Contact (Business Admin)</p>
            <p className="mt-1 text-sm font-semibold text-ink">{d.contact_name ?? "—"}</p>
            <p className="text-xs text-ink-soft">{d.contact_email ?? "No contact email"}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className={clsx("inline-flex items-center gap-1.5 text-xs font-medium", d.contact_email_verified ? "text-green-600" : "text-warn")}>
                <span className={clsx("h-1.5 w-1.5 rounded-full", d.contact_email_verified ? "bg-green-500" : "bg-warn")} />
                {d.contact_email_verified ? "Email verified" : "Email not verified"}
              </span>
              <span className="text-xs text-ink-muted">· {d.member_count} member{d.member_count === 1 ? "" : "s"}</span>
            </div>
          </div>
        </div>

        {/* Status timeline */}
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Approval timeline</p>
          <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-ink-muted">Status</dt>
              <dd className="font-medium capitalize text-ink">{d.status}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Type</dt>
              <dd className="font-medium text-ink">{d.is_legacy ? "Legacy" : d.is_personal ? "Personal workspace" : "Registered business"}</dd>
            </div>
            {d.approved_at && (
              <div>
                <dt className="text-xs text-ink-muted">Approved at</dt>
                <dd className="text-ink-soft">{new Date(d.approved_at).toLocaleString()}</dd>
              </div>
            )}
            {d.approved_by && (
              <div>
                <dt className="text-xs text-ink-muted">Approved by</dt>
                <dd className="font-mono text-xs text-ink-soft">{String(d.approved_by).slice(0, 8)}…</dd>
              </div>
            )}
            {d.rejected_at && (
              <div>
                <dt className="text-xs text-ink-muted">Rejected at</dt>
                <dd className="text-ink-soft">{new Date(d.rejected_at).toLocaleString()}</dd>
              </div>
            )}
            {d.rejection_reason && (
              <div className="sm:col-span-2">
                <dt className="text-xs text-ink-muted">Rejection reason</dt>
                <dd className="rounded-lg bg-destructive-50 px-3 py-2 text-sm text-destructive">{d.rejection_reason}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Actions */}
        {d.status === "pending" && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => approveMut.mutate()}
              disabled={approveMut.isPending}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Icon name="check" className="h-4 w-4" />
              {approveMut.isPending ? "Approving…" : "Approve & activate"}
            </button>
            <button
              onClick={() => setShowReject(true)}
              disabled={rejectMut.isPending}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-medium text-ink hover:bg-bg-soft"
            >
              Reject
            </button>
          </div>
        )}

        {d.status !== "pending" && (
          <p className="text-xs text-ink-muted">
            This business is already <strong>{d.status}</strong>. {d.status === "rejected" ? "It can be re-registered by the owner or re-approved via support." : "Members can sign in and use the workspace."}
          </p>
        )}

        {showReject && (
          <div className="rounded-xl border border-border bg-white p-4">
            <p className="text-sm font-medium text-ink">Reject business</p>
            <p className="text-xs text-ink-soft">Business admin will be emailed with this reason.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason (optional but recommended)"
              className="mt-3 min-h-[80px] w-full rounded-xl border border-border p-3 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setShowReject(false)} className="rounded-xl border border-border px-4 py-2 text-sm">Cancel</button>
              <button
                onClick={() => rejectMut.mutate()}
                disabled={rejectMut.isPending}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {rejectMut.isPending ? "Rejecting…" : "Reject & notify"}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function BusinessesTable() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<BusinessOut | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const pageSize = 10;

  const params: Record<string, string | number | undefined> = { page, page_size: pageSize };
  if (status !== "all") params.status = status;
  if (search) params.search = search;

  const { data, isLoading, error, isFetching } = useQuery<PaginatedBusinesses>({
    queryKey: queryKeys.businesses.list(params),
    queryFn: () => apiGet<PaginatedBusinesses>("/auth/admin/organizations", params),
    placeholderData: (prev) => prev,
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => apiPost(`/auth/admin/organizations/${id}/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.businesses.all });
      queryClient.invalidateQueries({ queryKey: ["admin-pending-orgs"] });
    },
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => apiPost(`/auth/admin/organizations/${id}/reject`, { reason }),
    onSuccess: () => {
      setRejectId(null);
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: queryKeys.businesses.all });
      queryClient.invalidateQueries({ queryKey: ["admin-pending-orgs"] });
    },
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;
  const counts = data?.counts ?? { pending: 0, approved: 0, rejected: 0, total: 0 };

  function handleSearch(v: string) {
    setSearch(v);
    setPage(1);
  }

  function handleStatus(next: StatusFilter) {
    setStatus(next);
    setPage(1);
  }

  return (
    <>
      <PageHeader
        title="Businesses"
        subtitle="Approve new registrations, view business details, and manage lifecycle."
        action={
          <div className="flex items-center gap-2">
            {isFetching && <span className="text-xs text-ink-muted">Updating…</span>}
            <Badge variant="secondary" className="text-xs">{total.toLocaleString()} total</Badge>
          </div>
        }
      />

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-xs text-ink-muted">Total</p>
          <p className="text-xl font-semibold text-ink">{counts.total.toLocaleString()}</p>
          <p className="text-xs text-ink-muted">businesses</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs text-amber-700">Pending</p>
          <p className="text-xl font-semibold text-amber-700">{counts.pending.toLocaleString()}</p>
          <p className="text-xs text-amber-600">awaiting approval</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-xs text-green-700">Approved</p>
          <p className="text-xl font-semibold text-green-700">{counts.approved.toLocaleString()}</p>
          <p className="text-xs text-green-600">active workspaces</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs text-red-700">Rejected</p>
          <p className="text-xl font-semibold text-red-700">{counts.rejected.toLocaleString()}</p>
          <p className="text-xs text-red-600">blocked</p>
        </div>
      </div>

      <Panel>
        {/* Filters bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {(["all", "pending", "approved", "rejected"] as StatusFilter[]).map((s) => {
              const active = status === s;
              const count = s === "all" ? counts.total : counts[s];
              return (
                <button
                  key={s}
                  onClick={() => handleStatus(s)}
                  className={clsx(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium capitalize",
                    active ? "border-primary bg-primary text-white" : "border-border bg-white text-ink-soft hover:bg-bg-soft",
                  )}
                >
                  {s}
                  <span className={clsx("rounded-full px-1.5 py-0.5 text-[10px]", active ? "bg-white/20 text-white" : "bg-bg-soft text-ink-muted")}>{count}</span>
                </button>
              );
            })}
          </div>
          <div className="w-full sm:w-72">
            <SearchInput value={search} onChange={handleSearch} placeholder="Search business, slug…" />
          </div>
        </div>

        <div className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-ink-soft">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              <span className="ml-3 text-sm">Loading businesses…</span>
            </div>
          ) : error ? (
            <div className="rounded-xl bg-warn-50 px-5 py-4 text-sm text-warn">{error instanceof Error ? error.message : "Failed to load businesses"}</div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-bg-soft text-ink-muted">
                <Icon name="building" className="h-5 w-5" />
              </div>
              <p className="mt-2 text-sm font-medium text-ink">No businesses found</p>
              <p className="text-xs text-ink-soft">{search ? `No match for "${search}"` : status !== "all" ? `No ${status} businesses` : "New registrations will appear here."}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <caption className="sr-only">Businesses list</caption>
                  <thead>
                    <tr className="border-b border-border text-xs font-semibold uppercase text-ink-muted">
                      <th className="whitespace-nowrap px-3 py-3" scope="col">Business</th>
                      <th className="whitespace-nowrap px-3 py-3" scope="col">Contact</th>
                      <th className="whitespace-nowrap px-3 py-3" scope="col">Status</th>
                      <th className="whitespace-nowrap px-3 py-3" scope="col">Type</th>
                      <th className="whitespace-nowrap px-3 py-3" scope="col">Members</th>
                      <th className="whitespace-nowrap px-3 py-3" scope="col">Created</th>
                      <th className="whitespace-nowrap px-3 py-3 text-right" scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((b) => (
                      <tr key={b.id} className="hover:bg-bg-soft/50">
                        <td className="px-3 py-3">
                          <div className="min-w-0 max-w-[220px]">
                            <p className="truncate font-medium text-ink">{b.name}</p>
                            <p className="truncate text-xs text-ink-muted">/{b.slug ?? "—"} · <span className="font-mono text-[11px]">{b.id.slice(0, 8)}…</span></p>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="max-w-[200px]">
                            <p className="truncate text-ink">{b.contact_name ?? <span className="italic text-ink-muted">—</span>}</p>
                            <p className="truncate text-xs text-ink-soft">{b.contact_email ?? "—"}</p>
                            {b.contact_email_verified != null && (
                              <span className={clsx("inline-flex items-center gap-1 text-[11px]", b.contact_email_verified ? "text-green-600" : "text-amber-600")}>
                                <span className={clsx("h-1 w-1 rounded-full", b.contact_email_verified ? "bg-green-500" : "bg-amber-500")} />
                                {b.contact_email_verified ? "verified" : "unverified"}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3"><StatusBadge status={b.status ?? "pending"} /></td>
                        <td className="px-3 py-3"><TypeBadge is_personal={!!b.is_personal} is_legacy={!!b.is_legacy} /></td>
                        <td className="px-3 py-3 text-ink-soft">{b.member_count}</td>
                        <td className="px-3 py-3 text-xs text-ink-soft whitespace-nowrap">{new Date(b.created_at).toLocaleDateString()}</td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setSelected(b)}
                              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-soft hover:bg-bg-soft hover:text-ink"
                            >
                              View
                            </button>
                            {b.status === "pending" && (
                              <>
                                <button
                                  onClick={() => approveMut.mutate(b.id)}
                                  disabled={approveMut.isPending}
                                  className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => setRejectId(b.id)}
                                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-warn hover:bg-warn-50"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4">
                <Pagination page={page} pages={pages} total={total} totalLabel="businesses" onChange={setPage} />
              </div>
            </>
          )}
        </div>
      </Panel>

      {selected && (
        <BusinessDetailModal
          business={selected}
          onClose={() => setSelected(null)}
          onApproved={() => setSelected(null)}
          onRejected={() => setSelected(null)}
        />
      )}

      {rejectId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lift">
            <h4 className="text-sm font-semibold text-ink">Reject business</h4>
            <p className="mt-1 text-xs text-ink-soft">Provide a reason — business admin will be emailed.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason (optional)"
              className="mt-3 min-h-[80px] w-full rounded-lg border border-border p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setRejectId(null)} className="rounded-lg border border-border px-4 py-2 text-sm">Cancel</button>
              <button
                onClick={() => rejectMut.mutate({ id: rejectId, reason: rejectReason || undefined })}
                disabled={rejectMut.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {rejectMut.isPending ? "Rejecting…" : "Reject & notify"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AccessDenied() {
  const router = useRouter();
  const base = useDashboardBase();
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="text-center">
        <Icon name="shield" className="mx-auto h-12 w-12 text-ink-muted" />
        <h2 className="mt-4 text-lg font-semibold text-ink">System Admin only</h2>
        <p className="mt-1 text-sm text-ink-soft">Business approvals require System Admin (super_admin) privileges.</p>
        <button onClick={() => router.push(base)} className="mt-4 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-white shadow-lift">Back to dashboard</button>
      </div>
    </div>
  );
}

export default function BusinessesClient() {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="flex items-center justify-center py-16 text-ink-soft"><span className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" /><span className="ml-3 text-sm">Checking access…</span></div>;
  }
  if (!user?.is_super_admin) return <AccessDenied />;
  return (
    <ErrorBoundary fallback={(error: Error) => (
      <>
        <PageHeader title="Businesses" subtitle="Manage businesses" />
        <Panel><div className="rounded-xl bg-warn-50 px-5 py-4 text-sm text-warn">{error.message}</div></Panel>
      </>
    )}>
      <BusinessesTable />
    </ErrorBoundary>
  );
}
