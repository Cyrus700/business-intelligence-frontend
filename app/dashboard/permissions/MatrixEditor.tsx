"use client";

import { useMemo, useState } from "react";
import Panel from "@/components/dashboard/Panel";
import Icon from "@/components/ui/Icon";
import SearchInput from "@/components/ui/SearchInput";
import { clsx } from "@/lib/cx";
import {
  roleBadgeClass,
  useResetMatrix,
  useSaveMatrix,
  useSyncCatalog,
  type GrantChange,
  type RbacMatrix,
} from "@/lib/rbac";
import { ConfirmDialog, ErrorNote, GhostButton, PrimaryButton, inputClass } from "./ui";

type Draft = Record<string, Set<string>>; // role name -> granted permission keys

function toDraft(matrix: RbacMatrix): Draft {
  return Object.fromEntries(
    matrix.roles.map((r) => [r.name, new Set(matrix.matrix[r.name] ?? [])]),
  );
}

/** Content fingerprint of the grid — `updated_at` alone misses grant-only edits. */
function signature(matrix: RbacMatrix): string {
  return JSON.stringify(
    matrix.roles.map((r) => [r.name, [...(matrix.matrix[r.name] ?? [])].sort()]),
  );
}

function diff(base: RbacMatrix, draft: Draft): GrantChange[] {
  const out: GrantChange[] = [];
  for (const role of base.roles) {
    const before = new Set(base.matrix[role.name] ?? []);
    const after = draft[role.name] ?? new Set<string>();
    for (const key of after) if (!before.has(key)) out.push({ role: role.name, permission: key, granted: true });
    for (const key of before) if (!after.has(key)) out.push({ role: role.name, permission: key, granted: false });
  }
  return out;
}

type Filter = "all" | "granted" | "ungranted" | "changed";

export default function MatrixEditor({
  matrix,
  canManage,
  currentRole,
}: {
  matrix: RbacMatrix;
  canManage: boolean;
  currentRole: string | null;
}) {
  const [baseline, setBaseline] = useState(matrix);
  const [draft, setDraft] = useState<Draft>(() => toDraft(matrix));
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("all");
  const [filter, setFilter] = useState<Filter>("all");
  const [showDiff, setShowDiff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const save = useSaveMatrix();
  const reset = useResetMatrix();
  const sync = useSyncCatalog();

  const changes = useMemo(() => diff(baseline, draft), [baseline, draft]);

  // Rebase onto server state when it moves (first real load after the offline
  // fallback, or another admin's edit arriving via refetch) — but never while
  // there are unsaved edits, which would silently discard them. Adjusted during
  // render rather than in an effect, per React's guidance for derived state.
  if (signature(matrix) !== signature(baseline) && changes.length === 0) {
    setBaseline(matrix);
    setDraft(toDraft(matrix));
  }
  const changedCells = useMemo(
    () => new Set(changes.map((c) => `${c.role}::${c.permission}`)),
    [changes],
  );

  const locked = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const r of matrix.roles) m.set(r.name, new Set(r.locked_permissions));
    return m;
  }, [matrix.roles]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return matrix.permissions.filter((p) => {
      if (group !== "all" && p.group_label !== group) return false;
      if (
        q &&
        !p.key.toLowerCase().includes(q) &&
        !p.label.toLowerCase().includes(q) &&
        !(p.description ?? "").toLowerCase().includes(q)
      )
        return false;
      if (filter === "changed")
        return matrix.roles.some((r) => changedCells.has(`${r.name}::${p.key}`));
      if (filter === "granted") return matrix.roles.some((r) => draft[r.name]?.has(p.key));
      if (filter === "ungranted") return !matrix.roles.some((r) => draft[r.name]?.has(p.key));
      return true;
    });
  }, [matrix.permissions, matrix.roles, search, group, filter, draft, changedCells]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof rows>();
    for (const p of rows) {
      const list = map.get(p.group_label) ?? [];
      list.push(p);
      map.set(p.group_label, list);
    }
    return [...map.entries()];
  }, [rows]);

  function toggle(role: string, key: string, next?: boolean) {
    if (!canManage) return;
    if (locked.get(role)?.has(key)) return;
    setDraft((prev) => {
      const set = new Set(prev[role] ?? []);
      const value = next ?? !set.has(key);
      if (value) set.add(key);
      else set.delete(key);
      return { ...prev, [role]: set };
    });
  }

  function setMany(role: string, keys: string[], granted: boolean) {
    if (!canManage) return;
    setDraft((prev) => {
      const set = new Set(prev[role] ?? []);
      for (const key of keys) {
        if (!granted && locked.get(role)?.has(key)) continue;
        if (granted) set.add(key);
        else set.delete(key);
      }
      return { ...prev, [role]: set };
    });
  }

  function toggleRow(key: string) {
    const editable = matrix.roles.filter((r) => !locked.get(r.name)?.has(key));
    const allOn = editable.every((r) => draft[r.name]?.has(key));
    for (const r of editable) toggle(r.name, key, !allOn);
  }

  function discard() {
    setDraft(toDraft(baseline));
    setError(null);
  }

  async function persist() {
    setError(null);
    try {
      const fresh = await save.mutateAsync(changes);
      setBaseline(fresh as RbacMatrix);
      setDraft(toDraft(fresh as RbacMatrix));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save changes");
    }
  }

  const dirty = changes.length > 0;

  return (
    <>
      <Panel
        title="Permission matrix"
        subtitle={
          canManage
            ? "Toggle any cell to grant or revoke. Changes are staged until you save."
            : "Every capability by role. Only administrators can edit this."
        }
        action={
          canManage && (
            <div className="flex flex-wrap items-center gap-2">
              <GhostButton
                type="button"
                onClick={() => sync.mutate()}
                disabled={sync.isPending}
                title="Add permissions introduced by a deploy but missing from the database"
              >
                <Icon name="pipe" className="h-4 w-4" />
                {sync.isPending ? "Syncing…" : "Sync catalog"}
              </GhostButton>
              <GhostButton type="button" onClick={() => setConfirmReset(true)}>
                <Icon name="arrow" className="h-4 w-4" />
                Reset to defaults
              </GhostButton>
            </div>
          )
        }
      >
        <ErrorNote message={error} />

        <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search permissions by name, key or description…"
          />
          <select
            aria-label="Filter by group"
            className={clsx(inputClass, "h-10 sm:w-56")}
            value={group}
            onChange={(e) => setGroup(e.target.value)}
          >
            <option value="all">All groups</option>
            {matrix.groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter cells"
            className={clsx(inputClass, "h-10 sm:w-44")}
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
          >
            <option value="all">Show all</option>
            <option value="granted">Granted somewhere</option>
            <option value="ungranted">Granted to nobody</option>
            <option value="changed">Unsaved changes</option>
          </select>
        </div>

        {rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-ink-muted">
            No permissions match these filters.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    Permission
                  </th>
                  {matrix.roles.map((role) => {
                    const count = draft[role.name]?.size ?? 0;
                    const allKeys = rows.map((p) => p.key);
                    const allOn = allKeys.every((k) => draft[role.name]?.has(k));
                    return (
                      <th key={role.name} className="px-3 py-3 text-center align-top">
                        <span
                          className={clsx(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            roleBadgeClass(role.color),
                            role.name === currentRole && "ring-2 ring-primary/40",
                            !role.is_active && "opacity-50",
                          )}
                        >
                          {role.label}
                        </span>
                        <span className="mt-1 block text-[11px] font-normal text-ink-muted">
                          {count} granted · {role.user_count} user
                          {role.user_count === 1 ? "" : "s"}
                        </span>
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => setMany(role.name, allKeys, !allOn)}
                            className="mt-1 text-[11px] font-medium text-primary hover:underline"
                          >
                            {allOn ? "Clear visible" : "Grant visible"}
                          </button>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {grouped.map(([groupLabel, perms]) => (
                  <GroupRows
                    key={groupLabel}
                    groupLabel={groupLabel}
                    perms={perms}
                    roles={matrix.roles}
                    draft={draft}
                    locked={locked}
                    changedCells={changedCells}
                    canManage={canManage}
                    onToggle={toggle}
                    onToggleRow={toggleRow}
                    onSetMany={setMany}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-3 text-xs text-ink-muted">
          Showing {rows.length} of {matrix.permissions.length} permissions across{" "}
          {matrix.roles.length} roles.
          {matrix.updated_at && (
            <> Last change {new Date(matrix.updated_at).toLocaleString()}.</>
          )}
        </p>
      </Panel>

      {canManage && dirty && (
        <div className="sticky bottom-4 z-20 mt-4">
          <div className="rounded-2xl border border-primary/30 bg-white p-4 shadow-lift">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon name="alert" className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {changes.length} unsaved change{changes.length === 1 ? "" : "s"}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowDiff((v) => !v)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {showDiff ? "Hide details" : "Review details"}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <GhostButton type="button" onClick={discard} disabled={save.isPending}>
                  Discard
                </GhostButton>
                <PrimaryButton type="button" onClick={persist} disabled={save.isPending}>
                  <Icon name="check" className="h-4 w-4" />
                  {save.isPending ? "Saving…" : "Save changes"}
                </PrimaryButton>
              </div>
            </div>

            {showDiff && (
              <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto border-t border-border pt-3">
                {changes.map((c) => (
                  <li
                    key={`${c.role}::${c.permission}`}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span
                      className={clsx(
                        "inline-flex h-5 items-center rounded-md px-1.5 font-semibold",
                        c.granted ? "bg-green-100 text-green-700" : "bg-warn-50 text-warn",
                      )}
                    >
                      {c.granted ? "GRANT" : "REVOKE"}
                    </span>
                    <code className="font-mono text-ink">{c.permission}</code>
                    <span className="text-ink-muted">
                      {c.granted ? "to" : "from"} {c.role}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {confirmReset && (
        <ConfirmDialog
          title="Reset to shipped defaults"
          confirmLabel="Reset matrix"
          pending={reset.isPending}
          error={reset.error instanceof Error ? reset.error.message : null}
          body={
            <>
              This rewrites the grants of the built-in roles (analyst, manager, admin) to the
              policy this version of the app ships with. Custom roles and custom permissions are
              kept, but any grant you changed on a built-in role will be lost. Unsaved edits are
              discarded too.
            </>
          }
          onConfirm={async () => {
            await reset.mutateAsync();
            setConfirmReset(false);
          }}
          onClose={() => setConfirmReset(false)}
        />
      )}
    </>
  );
}

function GroupRows({
  groupLabel,
  perms,
  roles,
  draft,
  locked,
  changedCells,
  canManage,
  onToggle,
  onToggleRow,
  onSetMany,
}: {
  groupLabel: string;
  perms: RbacMatrix["permissions"];
  roles: RbacMatrix["roles"];
  draft: Draft;
  locked: Map<string, Set<string>>;
  changedCells: Set<string>;
  canManage: boolean;
  onToggle: (role: string, key: string) => void;
  onToggleRow: (key: string) => void;
  onSetMany: (role: string, keys: string[], granted: boolean) => void;
}) {
  const keys = perms.map((p) => p.key);
  return (
    <>
      <tr className="bg-bg-soft/60">
        <td className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
          {groupLabel}
        </td>
        {roles.map((role) => {
          const on = keys.filter((k) => draft[role.name]?.has(k)).length;
          return (
            <td key={role.name} className="px-3 py-2 text-center">
              {canManage ? (
                <button
                  type="button"
                  onClick={() => onSetMany(role.name, keys, on < keys.length)}
                  className="rounded-md px-1.5 py-0.5 text-[11px] font-medium text-ink-muted hover:bg-white hover:text-primary"
                  title={`Grant or clear all ${groupLabel} permissions for ${role.label}`}
                >
                  {on}/{keys.length}
                </button>
              ) : (
                <span className="text-[11px] text-ink-muted">
                  {on}/{keys.length}
                </span>
              )}
            </td>
          );
        })}
      </tr>

      {perms.map((perm) => (
        <tr key={perm.key} className="group hover:bg-bg-soft/40">
          <td className="px-4 py-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0">
                <span className="font-medium text-ink">{perm.label}</span>
                {!perm.is_system && (
                  <span className="ml-2 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
                    Custom
                  </span>
                )}
                <p className="text-xs text-ink-muted">{perm.description}</p>
                <code className="mt-0.5 block font-mono text-[11px] text-ink-muted">
                  {perm.key}
                </code>
              </div>
              {canManage && (
                <button
                  type="button"
                  onClick={() => onToggleRow(perm.key)}
                  className="ml-auto shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-ink-muted opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
                  title="Toggle this permission for every role"
                >
                  all
                </button>
              )}
            </div>
          </td>

          {roles.map((role) => {
            const granted = draft[role.name]?.has(perm.key) ?? false;
            const isLocked = locked.get(role.name)?.has(perm.key) ?? false;
            const changed = changedCells.has(`${role.name}::${perm.key}`);
            return (
              <td key={role.name} className="px-3 py-3 text-center">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={granted}
                  aria-label={`${perm.label} for ${role.label}`}
                  disabled={!canManage || isLocked}
                  onClick={() => onToggle(role.name, perm.key)}
                  title={
                    isLocked
                      ? "Locked — removing this would leave nobody able to administer access"
                      : undefined
                  }
                  className={clsx(
                    "grid h-6 w-6 place-items-center rounded-md border transition-all",
                    granted
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-white text-transparent",
                    changed && "ring-2 ring-warn ring-offset-1",
                    canManage && !isLocked
                      ? "cursor-pointer hover:border-primary"
                      : "cursor-not-allowed opacity-70",
                  )}
                >
                  <Icon name={isLocked ? "lock" : "check"} className="h-3.5 w-3.5" />
                </button>
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
