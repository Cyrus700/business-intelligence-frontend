"use client";

import { useMemo, useState } from "react";
import Panel from "@/components/dashboard/Panel";
import Icon from "@/components/ui/Icon";
import { clsx } from "@/lib/cx";
import {
  ROLE_COLORS,
  roleBadgeClass,
  roleDotClass,
  useCreateRole,
  useDeleteRole,
  useUpdateRole,
  type RbacMatrix,
  type RbacRole,
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

export default function RolesManager({
  matrix,
  canManage,
  currentRole,
}: {
  matrix: RbacMatrix;
  canManage: boolean;
  currentRole: string | null;
}) {
  const [editing, setEditing] = useState<RbacRole | null>(null);
  // null = closed, "" = blank new role, "<name>" = pre-seeded from that role
  const [creating, setCreating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<RbacRole | null>(null);
  const remove = useDeleteRole();

  const roles = useMemo(
    () => [...matrix.roles].sort((a, b) => b.rank - a.rank),
    [matrix.roles],
  );

  return (
    <>
      <Panel
        title="Roles"
        subtitle="Define the hierarchy. Rank decides which role satisfies a “manager or higher” check."
        action={
          canManage && (
            <PrimaryButton type="button" onClick={() => setCreating("")}>
              <Icon name="plus" className="h-4 w-4" />
              New role
            </PrimaryButton>
          )
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => (
            <div
              key={role.name}
              className={clsx(
                "flex flex-col rounded-xl border p-5 transition-all",
                role.name === currentRole ? "border-primary ring-2 ring-primary/20" : "border-border",
                !role.is_active && "bg-bg-soft/60",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={clsx(
                    "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
                    roleBadgeClass(role.color),
                  )}
                >
                  <span className={clsx("h-1.5 w-1.5 rounded-full", roleDotClass(role.color))} />
                  {role.label}
                </span>
                <span className="rounded-md bg-bg-soft px-1.5 py-0.5 text-[11px] font-medium text-ink-muted">
                  rank {role.rank}
                </span>
              </div>

              <code className="mt-2 font-mono text-[11px] text-ink-muted">{role.name}</code>
              <p className="mt-2 flex-1 text-sm text-ink-soft">{role.description}</p>

              <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg bg-bg-soft p-2">
                  <p className="text-base font-semibold text-ink">{role.permissions.length}</p>
                  <p className="text-[11px] text-ink-muted">permissions</p>
                </div>
                <div className="rounded-lg bg-bg-soft p-2">
                  <p className="text-base font-semibold text-ink">{role.user_count}</p>
                  <p className="text-[11px] text-ink-muted">users</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                {role.is_system ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-bg-soft px-1.5 py-0.5 font-medium text-ink-muted">
                    <Icon name="lock" className="h-3 w-3" />
                    System role
                  </span>
                ) : (
                  <span className="rounded-md bg-primary/10 px-1.5 py-0.5 font-semibold uppercase text-primary">
                    Custom
                  </span>
                )}
                {!role.is_active && (
                  <span className="rounded-md bg-warn-50 px-1.5 py-0.5 font-medium text-warn">
                    Deactivated
                  </span>
                )}
                {role.name === currentRole && (
                  <span className="inline-flex items-center gap-1 font-medium text-primary">
                    <Icon name="check" className="h-3 w-3" />
                    Your role
                  </span>
                )}
              </div>

              {canManage && (
                <div className="mt-4 flex items-center gap-1 border-t border-border pt-3">
                  <button
                    type="button"
                    onClick={() => setEditing(role)}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-soft hover:bg-bg-soft hover:text-ink"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreating(role.name)}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-soft hover:bg-bg-soft hover:text-ink"
                    title={`Create a new role starting from ${role.label}'s permissions`}
                  >
                    Duplicate
                  </button>
                  {!role.is_system && (
                    <button
                      type="button"
                      onClick={() => setDeleting(role)}
                      className="ml-auto rounded-lg px-2.5 py-1.5 text-xs font-medium text-warn hover:bg-warn-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Panel>

      {creating !== null && (
        <RoleModal
          matrix={matrix}
          defaultCloneFrom={creating}
          onClose={() => setCreating(null)}
        />
      )}
      {editing && (
        <RoleModal matrix={matrix} role={editing} onClose={() => setEditing(null)} />
      )}
      {deleting && (
        <ConfirmDialog
          title={`Delete role “${deleting.label}”`}
          confirmLabel="Delete role"
          pending={remove.isPending}
          error={remove.error instanceof Error ? remove.error.message : null}
          body={
            deleting.user_count > 0 ? (
              <>
                <strong>{deleting.user_count}</strong> user
                {deleting.user_count === 1 ? " is" : "s are"} still assigned this role. Reassign
                them on the Users page first — the server will refuse this delete.
              </>
            ) : (
              <>
                This removes the role and its {deleting.permissions.length} grants. It cannot be
                undone.
              </>
            )
          }
          onConfirm={async () => {
            await remove.mutateAsync(deleting.name);
            setDeleting(null);
          }}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}

function RoleModal({
  matrix,
  role,
  defaultCloneFrom = "",
  onClose,
}: {
  matrix: RbacMatrix;
  role?: RbacRole;
  defaultCloneFrom?: string;
  onClose: () => void;
}) {
  const isEdit = Boolean(role);
  const nextRank = Math.max(0, ...matrix.roles.map((r) => r.rank)) + 1;

  const [name, setName] = useState(role?.name ?? "");
  const [label, setLabel] = useState(role?.label ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [rank, setRank] = useState(role?.rank ?? nextRank);
  const [color, setColor] = useState(role?.color ?? "slate");
  const [isActive, setIsActive] = useState(role?.is_active ?? true);
  const [cloneFrom, setCloneFrom] = useState<string>(defaultCloneFrom);
  const [error, setError] = useState<string | null>(null);

  const create = useCreateRole();
  const update = useUpdateRole();
  const pending = create.isPending || update.isPending;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (isEdit && role) {
        await update.mutateAsync({
          name: role.name,
          body: {
            label,
            description: description || null,
            rank,
            color,
            is_active: isActive,
          },
        });
      } else {
        await create.mutateAsync({
          name,
          label,
          description: description || null,
          rank,
          color,
          is_active: isActive,
          clone_from: cloneFrom || null,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    }
  }

  return (
    <Modal
      title={isEdit ? `Edit role “${role?.label}”` : "New role"}
      subtitle={
        isEdit
          ? "Grants are edited in the matrix; this changes the role's identity and position."
          : "Create a role, optionally copying an existing role's permissions as a starting point."
      }
      onClose={onClose}
      wide
    >
      <ErrorNote message={error} />
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Slug"
          hint="Lowercase identifier stored on each user. Cannot be changed later."
        >
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value.toLowerCase())}
            pattern="^[a-z][a-z0-9_-]{1,31}$"
            placeholder="regional-manager"
            required
            disabled={isEdit}
          />
        </Field>

        <Field label="Display name">
          <input
            className={inputClass}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Regional Manager"
            required
          />
        </Field>

        <Field
          label="Rank"
          className="sm:col-span-2"
          hint={`Higher wins. Existing ranks: ${matrix.roles
            .map((r) => `${r.name} ${r.rank}`)
            .join(", ")}.`}
        >
          <input
            type="number"
            min={1}
            max={999}
            className={inputClass}
            value={rank}
            onChange={(e) => setRank(Number(e.target.value))}
            required
          />
        </Field>

        <Field label="Description" className="sm:col-span-2">
          <textarea
            className={clsx(inputClass, "h-24 py-2.5")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this role is for…"
          />
        </Field>

        <Field label="Colour" className="sm:col-span-2">
          <div className="flex flex-wrap gap-2">
            {ROLE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={c}
                aria-pressed={color === c}
                className={clsx(
                  "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-all",
                  roleBadgeClass(c),
                  color === c ? "ring-2 ring-primary ring-offset-1" : "opacity-70",
                )}
              >
                <span className={clsx("h-1.5 w-1.5 rounded-full", roleDotClass(c))} />
                {c}
              </button>
            ))}
          </div>
        </Field>

        {!isEdit && (
          <Field
            label="Copy permissions from"
            className="sm:col-span-2"
            hint="Optional. Start from an existing role's grants, then fine-tune in the matrix."
          >
            <select
              className={inputClass}
              value={cloneFrom}
              onChange={(e) => setCloneFrom(e.target.value)}
            >
              <option value="">Start with no permissions</option>
              {matrix.roles.map((r) => (
                <option key={r.name} value={r.name}>
                  {r.label} ({r.permissions.length} permissions)
                </option>
              ))}
            </select>
          </Field>
        )}

        <label className="flex cursor-pointer items-center gap-3 sm:col-span-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-sm text-ink">
            Active
            <span className="ml-1 text-ink-muted">— deactivated roles cannot be assigned</span>
          </span>
        </label>

        <div className="flex justify-end gap-3 pt-2 sm:col-span-2">
          <GhostButton type="button" onClick={onClose}>
            Cancel
          </GhostButton>
          <PrimaryButton type="submit" disabled={pending}>
            {pending ? "Saving…" : isEdit ? "Save changes" : "Create role"}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
