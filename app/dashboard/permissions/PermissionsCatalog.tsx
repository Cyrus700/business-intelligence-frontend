"use client";

import { useMemo, useState } from "react";
import Panel from "@/components/dashboard/Panel";
import Icon from "@/components/ui/Icon";
import SearchInput from "@/components/ui/SearchInput";
import { clsx } from "@/lib/cx";
import {
  roleBadgeClass,
  useCreatePermission,
  useDeletePermission,
  useUpdatePermission,
  type RbacMatrix,
  type RbacPermission,
} from "@/lib/rbac";
import {
  ConfirmDialog,
  ErrorNote,
  Field,
  GhostButton,
  Modal,
  PrimaryButton,
  inputClass,
} from "./ui";

export default function PermissionsCatalog({
  matrix,
  canManage,
}: {
  matrix: RbacMatrix;
  canManage: boolean;
}) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<RbacPermission | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<RbacPermission | null>(null);
  const remove = useDeletePermission();

  const colorByRole = useMemo(
    () => new Map(matrix.roles.map((r) => [r.name, r.color])),
    [matrix.roles],
  );

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map<string, RbacPermission[]>();
    for (const p of matrix.permissions) {
      if (
        q &&
        !p.key.toLowerCase().includes(q) &&
        !p.label.toLowerCase().includes(q) &&
        !p.group_label.toLowerCase().includes(q)
      )
        continue;
      const list = map.get(p.group_label) ?? [];
      list.push(p);
      map.set(p.group_label, list);
    }
    return [...map.entries()];
  }, [matrix.permissions, search]);

  return (
    <>
      <Panel
        title="Permission catalog"
        subtitle="The capabilities the matrix is built from. Custom permissions let you gate your own features."
        action={
          canManage && (
            <PrimaryButton type="button" onClick={() => setCreating(true)}>
              <Icon name="plus" className="h-4 w-4" />
              New permission
            </PrimaryButton>
          )
        }
      >
        <div className="mb-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Search permissions…" />
        </div>

        {grouped.length === 0 ? (
          <div className="py-16 text-center text-sm text-ink-muted">
            No permissions match “{search}”.
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([group, perms]) => (
              <div key={group}>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  {group}
                </h4>
                <div className="overflow-hidden rounded-xl border border-border">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <tbody className="divide-y divide-border">
                      {perms.map((p) => (
                        <tr key={p.key} className="hover:bg-bg-soft/40">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-ink">{p.label}</span>
                              {!p.is_system && (
                                <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
                                  Custom
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-ink-muted">{p.description}</p>
                            <code className="font-mono text-[11px] text-ink-muted">{p.key}</code>
                          </td>
                          <td className="px-4 py-3">
                            {p.granted_to.length === 0 ? (
                              <span className="text-xs text-ink-muted">Granted to nobody</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {p.granted_to.map((name) => (
                                  <span
                                    key={name}
                                    className={clsx(
                                      "rounded-full px-2 py-0.5 text-[11px] font-medium",
                                      roleBadgeClass(colorByRole.get(name) ?? "slate"),
                                    )}
                                  >
                                    {name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          {canManage && (
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => setEditing(p)}
                                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-soft hover:bg-bg-soft hover:text-ink"
                                >
                                  Edit
                                </button>
                                {!p.is_system && (
                                  <button
                                    type="button"
                                    onClick={() => setDeleting(p)}
                                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-warn hover:bg-warn-50"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {(creating || editing) && (
        <PermissionModal
          matrix={matrix}
          permission={editing ?? undefined}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title={`Delete permission “${deleting.label}”`}
          confirmLabel="Delete permission"
          pending={remove.isPending}
          error={remove.error instanceof Error ? remove.error.message : null}
          body={
            <>
              <code className="font-mono">{deleting.key}</code> will be removed from the catalog
              and revoked from {deleting.granted_to.length} role
              {deleting.granted_to.length === 1 ? "" : "s"}. Any code still checking this key will
              start denying access.
            </>
          }
          onConfirm={async () => {
            await remove.mutateAsync(deleting.key);
            setDeleting(null);
          }}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}

function PermissionModal({
  matrix,
  permission,
  onClose,
}: {
  matrix: RbacMatrix;
  permission?: RbacPermission;
  onClose: () => void;
}) {
  const isEdit = Boolean(permission);
  const [key, setKey] = useState(permission?.key ?? "");
  const [label, setLabel] = useState(permission?.label ?? "");
  const [description, setDescription] = useState(permission?.description ?? "");
  const [group, setGroup] = useState(permission?.group_label ?? matrix.groups[0] ?? "General");
  const [newGroup, setNewGroup] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = useCreatePermission();
  const update = useUpdatePermission();
  const pending = create.isPending || update.isPending;

  const groupLabel = group === "__new__" ? newGroup.trim() : group;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!groupLabel) {
      setError("Give the new group a name.");
      return;
    }
    try {
      if (isEdit && permission) {
        await update.mutateAsync({
          key: permission.key,
          body: { label, description: description || null, group_label: groupLabel },
        });
      } else {
        await create.mutateAsync({
          key,
          label,
          description: description || null,
          group_label: groupLabel,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    }
  }

  return (
    <Modal
      title={isEdit ? `Edit “${permission?.label}”` : "New permission"}
      subtitle="Permissions are checked by the API as resource:action — the key must match what your code asks for."
      onClose={onClose}
    >
      <ErrorNote message={error} />
      <form onSubmit={submit} className="space-y-4">
        <Field label="Key" hint="Format: resource:action, e.g. budgets:approve. Immutable.">
          <input
            className={clsx(inputClass, "font-mono")}
            value={key}
            onChange={(e) => setKey(e.target.value.toLowerCase())}
            pattern="^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$"
            placeholder="budgets:approve"
            required
            disabled={isEdit}
          />
        </Field>

        <Field label="Display name">
          <input
            className={inputClass}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Approve budgets"
            required
          />
        </Field>

        <Field label="Description">
          <textarea
            className={clsx(inputClass, "h-20 py-2.5")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this permission allows…"
          />
        </Field>

        <Field label="Group" hint="Controls where the row appears in the matrix.">
          <select
            className={inputClass}
            value={group}
            onChange={(e) => setGroup(e.target.value)}
          >
            {matrix.groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
            <option value="__new__">+ New group…</option>
          </select>
        </Field>

        {group === "__new__" && (
          <Field label="New group name">
            <input
              className={inputClass}
              value={newGroup}
              onChange={(e) => setNewGroup(e.target.value)}
              placeholder="Budgeting"
              required
            />
          </Field>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <GhostButton type="button" onClick={onClose}>
            Cancel
          </GhostButton>
          <PrimaryButton type="submit" disabled={pending}>
            {pending ? "Saving…" : isEdit ? "Save changes" : "Create permission"}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
