"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import { Modal } from "@/components/ui/Modal";
import Icon from "@/components/ui/Icon";
import SearchInput from "@/components/ui/SearchInput";
import Pagination from "@/components/ui/Pagination";
import { clsx } from "@/lib/cx";
import { ErrorBoundary } from "@/lib/error-boundary";
import { useRole, hasMinRole, useDashboardBase } from "@/lib/use-role";
import { apiGet, apiPost, apiPatch, queryKeys } from "@/lib/api";
import type { UserProfile, UserCreateBody, UserUpdateBody, PaginatedUsers } from "@/lib/api";

type ModalMode = "create" | "edit" | null;

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  manager: "bg-blue-100 text-blue-700",
  analyst: "bg-green-100 text-green-700",
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        ROLE_BADGE[role] ?? "bg-border text-ink-soft",
      )}
    >
      {role}
    </span>
  );
}

function UserModal({
  mode,
  user,
  onClose,
}: {
  mode: NonNullable<ModalMode>;
  user: UserProfile | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [role, setRole] = useState<string>(user?.role ?? "analyst");
  const [department, setDepartment] = useState(user?.department ?? "");
  const [isActive, setIsActive] = useState(user?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);

  const isCreate = mode === "create";

  const createMutation = useMutation({
    mutationFn: (body: UserCreateBody) => apiPost<UserProfile>("/users", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UserUpdateBody }) =>
      apiPatch<UserProfile>(`/users/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (isCreate) {
      createMutation.mutate({
        email,
        password: password || "Temp@123456",
        full_name: fullName || null,
        role: role as UserCreateBody["role"],
        department: department || null,
      });
    } else if (user) {
      const body: UserUpdateBody = {};
      if (fullName !== (user.full_name ?? "")) body.full_name = fullName || null;
      if (role !== user.role) body.role = role as UserUpdateBody["role"];
      if (department !== (user.department ?? "")) body.department = department || null;
      if (isActive !== user.is_active) body.is_active = isActive;
      updateMutation.mutate({ id: user.id, body });
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal title={isCreate ? "Create user" : "Edit user"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-warn-50 px-4 py-3 text-sm text-warn">{error}</div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-ink">Email</span>
            <input
              className="h-11 w-full rounded-xl border border-border bg-white px-3.5 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={!isCreate}
            />
          </label>

          {isCreate && (
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-ink">Password</span>
              <input
                type="password"
                className="h-11 w-full rounded-xl border border-border bg-white px-3.5 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave empty for default"
              />
            </label>
          )}

          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-ink">Full name</span>
            <input
              className="h-11 w-full rounded-xl border border-border bg-white px-3.5 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">Role</span>
            <select
              className="h-11 w-full rounded-xl border border-border bg-white px-3.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="analyst">Analyst</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">Department</span>
            <input
              className="h-11 w-full rounded-xl border border-border bg-white px-3.5 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </label>

          {!isCreate && (
            <label className="flex cursor-pointer items-center gap-3 sm:col-span-2">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-ink">Active</span>
            </label>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center rounded-xl border border-border bg-white px-4 text-sm font-medium text-ink hover:bg-bg-soft"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-white shadow-lift hover:bg-primary-600 disabled:opacity-50"
          >
            {saving ? "Saving..." : isCreate ? "Create user" : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteConfirm({
  user,
  onClose,
}: {
  user: UserProfile;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => apiPatch(`/users/${id}`, { is_active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-6 shadow-lift">
        <h2 className="text-lg font-semibold text-ink">Deactivate user</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Are you sure you want to deactivate <strong>{user.email}</strong>? They will lose access
          to the dashboard immediately.
        </p>
        {error && (
          <div className="mt-3 rounded-xl bg-warn-50 px-4 py-3 text-sm text-warn">{error}</div>
        )}
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center rounded-xl border border-border bg-white px-4 text-sm font-medium text-ink hover:bg-bg-soft"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => deactivateMutation.mutate(user.id)}
            disabled={deactivateMutation.isPending}
            className="inline-flex h-10 items-center rounded-xl bg-warn px-4 text-sm font-medium text-white shadow-lift hover:bg-red-600 disabled:opacity-50"
          >
            {deactivateMutation.isPending ? "Deactivating..." : "Deactivate"}
          </button>
        </div>
      </div>
    </div>
  );
}

function UsersTable() {
  const [modal, setModal] = useState<ModalMode>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const params: Record<string, string | number | boolean | undefined> = { page, page_size: 20 };
  if (search) params.search = search;

  const { data, isLoading, error } = useQuery<PaginatedUsers>({
    queryKey: ["users", "paginated", params],
    queryFn: () => apiGet<PaginatedUsers>("/users", params),
  });

  const queryClient = useQueryClient();

  function openCreate() {
    setEditingUser(null);
    setModal("create");
  }

  function openEdit(user: UserProfile) {
    setEditingUser(user);
    setModal("edit");
  }

  function handleSearch(v: string) {
    setSearch(v);
    setPage(1);
  }

  const users = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 20));

  if (isLoading) {
    return (
      <>
        <PageHeader title="Users" subtitle="Manage users, roles and access permissions." />
        <Panel>
          <div className="flex items-center justify-center py-16 text-ink-soft">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
            <span className="ml-3 text-sm">Loading users…</span>
          </div>
        </Panel>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Users" subtitle="Manage users, roles and access permissions." />
        <Panel>
          <div className="rounded-xl bg-warn-50 px-5 py-4 text-sm text-warn">
            {error instanceof Error ? error.message : "Failed to load users"}
          </div>
        </Panel>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Manage users, roles and access permissions."
        action={
          <button
            onClick={openCreate}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-white shadow-lift hover:bg-primary-600"
          >
            <Icon name="user" className="h-4 w-4" />
            Add user
          </button>
        }
      />

      <Panel>
        <div className="mb-4">
          <SearchInput
            value={search}
            onChange={handleSearch}
            placeholder="Search by name or email…"
          />
        </div>

        {users.length === 0 ? (
          <div className="py-16 text-center text-sm text-ink-muted">
            {search
              ? `No users matching "${search}".`
              : 'No users found. Click <strong>Add user</strong> to create one.'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
<caption className="sr-only">Users list</caption>
<caption className="sr-only">Users list</caption>
                <thead>
                  <tr className="border-b border-border text-xs font-semibold uppercase text-ink-muted">
                    <th className="whitespace-nowrap px-3 py-3" scope="col">Name</th>
                    <th className="whitespace-nowrap px-3 py-3" scope="col">Email</th>
                    <th className="whitespace-nowrap px-3 py-3" scope="col">Role</th>
                    <th className="whitespace-nowrap px-3 py-3" scope="col">Department</th>
                    <th className="whitespace-nowrap px-3 py-3" scope="col">Status</th>
                    <th className="whitespace-nowrap px-3 py-3 text-right" scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-bg-soft/50">
                      <td className="px-3 py-3 font-medium text-ink">
                        {u.full_name || <span className="text-ink-muted italic">—</span>}
                      </td>
                      <td className="px-3 py-3 text-ink-soft">{u.email}</td>
                      <td className="px-3 py-3">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-3 py-3 text-ink-soft">
                        {u.department || <span className="text-ink-muted">—</span>}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={clsx(
                            "inline-flex items-center gap-1.5 text-xs font-medium",
                            u.is_active ? "text-green-600" : "text-ink-muted",
                          )}
                        >
                          <span
                            className={clsx(
                              "h-1.5 w-1.5 rounded-full",
                              u.is_active ? "bg-green-500" : "bg-border",
                            )}
                          />
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(u)}
                            type="button"
                            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-soft hover:bg-bg-soft hover:text-ink"
                          >
                            Edit
                          </button>
                          {u.is_active && (
                            <button
                              onClick={() => setDeletingUser(u)}
                              type="button"
                              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-warn hover:bg-warn-50"
                            >
                              Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4">
              <Pagination
                page={page}
                pages={pages}
                total={total}
                totalLabel="users"
                onChange={setPage}
              />
            </div>
          </>
        )}
      </Panel>

      {modal && (
        <UserModal
          mode={modal}
          user={editingUser}
          onClose={() => {
            setModal(null);
            setEditingUser(null);
          }}
        />
      )}

      {deletingUser && (
        <DeleteConfirm
          user={deletingUser}
          onClose={() => setDeletingUser(null)}
        />
      )}
    </>
  );
}

function AccessDeniedFallback() {
  const router = useRouter();
  const base = useDashboardBase();
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="text-center">
        <Icon name="shield" className="mx-auto h-12 w-12 text-ink-muted" />
        <h2 className="mt-4 text-lg font-semibold text-ink">Access denied</h2>
        <p className="mt-1 text-sm text-ink-soft">Only administrators can manage users.</p>
        <button
          onClick={() => router.push(base)}
          className="mt-4 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-white shadow-lift"
        >
          Back to dashboard
        </button>
      </div>
    </div>
  );
}

export default function UsersClient() {
  const role = useRole();

  if (!hasMinRole(role, "admin")) {
    return <AccessDeniedFallback />;
  }

  return (
    <ErrorBoundary fallback={(error: Error) => (
      <>
        <PageHeader title="Users" subtitle="Manage users, roles and access permissions." />
        <Panel>
          <div className="rounded-xl bg-warn-50 px-5 py-4 text-sm text-warn">{error.message}</div>
        </Panel>
      </>
    )}>
      <UsersTable />
    </ErrorBoundary>
  );
}
