"use client";

import { useApi } from "@/lib/api";
import type { InventoryRow } from "@/lib/api";
import { EmptyState, PanelError, PanelSkeleton } from "./Status";

export default function LowStock() {
  const { data, error, loading } = useApi<InventoryRow[]>("/inventory/levels", {
    below_reorder: true,
  });

  if (error) return <PanelError message={error} />;
  if (loading || !data) return <PanelSkeleton className="h-40" />;
  if (data.length === 0) return <EmptyState label="All products above reorder level 🎉" />;

  return (
    <ul className="space-y-3">
      {data.slice(0, 6).map((r) => (
        <li key={r.sku} className="flex items-center gap-3 text-sm">
          <span className="h-2 w-2 shrink-0 rounded-full bg-warn" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-ink">{r.product}</p>
            <p className="text-xs text-ink-muted">
              {r.sku} · as of {r.snapshot_date}
            </p>
          </div>
          <span className="font-mono text-warn">
            {r.quantity_on_hand}/{r.reorder_level}
          </span>
        </li>
      ))}
    </ul>
  );
}
