"use client";

import Panel from "@/components/dashboard/Panel";
import Icon from "@/components/ui/Icon";
import { clsx } from "@/lib/cx";
import { useRbacAudit, type RbacAuditEntry } from "@/lib/rbac";
import { Spinner } from "./ui";

type Change = { role: string; permission: string; granted: boolean };

/** Renders the audit `detail` blob the backend writes for each RBAC mutation. */
function Summary({ entry }: { entry: RbacAuditEntry }) {
  const d = entry.detail ?? {};

  if (Array.isArray(d.changes)) {
    return <GrantList changes={d.changes as Change[]} />;
  }
  if (Array.isArray(d.replaced_grants)) {
    return (
      <>
        <p className="text-sm text-ink-soft">
          Replaced the grants of <strong>{entry.entity_id}</strong>
        </p>
        <GrantList changes={d.replaced_grants as Change[]} />
      </>
    );
  }
  if (d.created) {
    const created = d.created as Record<string, unknown>;
    return (
      <p className="text-sm text-ink-soft">
        Created {entry.entity} <strong>{entry.entity_id}</strong>
        {typeof created.rank === "number" && <> at rank {created.rank}</>}
        {typeof d.cloned_from === "string" && d.cloned_from && (
          <> — cloned from {d.cloned_from}</>
        )}
        {Array.isArray(d.permissions) && d.permissions.length > 0 && (
          <> with {(d.permissions as string[]).length} permissions</>
        )}
      </p>
    );
  }
  if (d.deleted) {
    return (
      <p className="text-sm text-ink-soft">
        Deleted {entry.entity} <strong>{entry.entity_id}</strong>
      </p>
    );
  }
  if (d.before && d.after) {
    const after = d.after as Record<string, unknown>;
    const before = d.before as Record<string, unknown>;
    return (
      <div className="text-sm text-ink-soft">
        Updated {entry.entity} <strong>{entry.entity_id}</strong>
        <ul className="mt-1 space-y-0.5">
          {Object.keys(after).map((field) => (
            <li key={field} className="text-xs">
              <span className="text-ink-muted">{field}:</span>{" "}
              <span className="line-through opacity-60">{String(before[field] ?? "—")}</span>{" "}
              <span className="text-ink">→ {String(after[field] ?? "—")}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (Array.isArray(d.reset_to_defaults)) {
    const items = d.reset_to_defaults as Array<{
      role: string;
      added: string[];
      removed: string[];
    }>;
    return (
      <div className="text-sm text-ink-soft">
        Reset the matrix to shipped defaults
        <ul className="mt-1 space-y-0.5 text-xs">
          {items.map((i) => (
            <li key={i.role}>
              <strong>{i.role}</strong>: +{i.added.length} / −{i.removed.length}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (Array.isArray(d.synced_permissions)) {
    return (
      <p className="text-sm text-ink-soft">
        Synced {(d.synced_permissions as string[]).length} new permission(s) from the code catalog
      </p>
    );
  }
  return <p className="text-sm text-ink-soft">Updated access control</p>;
}

function GrantList({ changes }: { changes: Change[] }) {
  const shown = changes.slice(0, 8);
  return (
    <ul className="mt-1 space-y-0.5">
      {shown.map((c, i) => (
        <li key={`${c.role}-${c.permission}-${i}`} className="flex items-center gap-2 text-xs">
          <span
            className={clsx(
              "inline-flex h-4 items-center rounded px-1 font-semibold",
              c.granted ? "bg-green-100 text-green-700" : "bg-warn-50 text-warn",
            )}
          >
            {c.granted ? "+" : "−"}
          </span>
          <code className="font-mono text-ink">{c.permission}</code>
          <span className="text-ink-muted">{c.granted ? "to" : "from"} {c.role}</span>
        </li>
      ))}
      {changes.length > shown.length && (
        <li className="text-xs text-ink-muted">+{changes.length - shown.length} more</li>
      )}
    </ul>
  );
}

export default function RbacActivity({ enabled }: { enabled: boolean }) {
  const { data, isLoading, error } = useRbacAudit(50, enabled);

  return (
    <Panel
      title="Change history"
      subtitle="Every edit to roles, permissions and grants, with who made it."
    >
      {isLoading ? (
        <Spinner label="Loading history…" />
      ) : error ? (
        <div className="rounded-xl bg-warn-50 px-5 py-4 text-sm text-warn">
          {error instanceof Error ? error.message : "Failed to load history"}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="py-16 text-center text-sm text-ink-muted">
          No changes recorded yet. Edits made in this console will appear here.
        </div>
      ) : (
        <ol className="relative space-y-5 border-l border-border pl-6">
          {data.map((entry) => (
            <li key={entry.id} className="relative">
              <span className="absolute -left-[31px] grid h-5 w-5 place-items-center rounded-full border border-border bg-white">
                <Icon name="shield" className="h-3 w-3 text-primary" />
              </span>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-sm font-medium text-ink">
                  {entry.actor_email ?? "System"}
                </span>
                <span className="text-xs text-ink-muted">
                  {new Date(entry.created_at).toLocaleString()}
                </span>
              </div>
              <div className="mt-0.5">
                <Summary entry={entry} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
