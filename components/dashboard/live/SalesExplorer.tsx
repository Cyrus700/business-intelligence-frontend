"use client";

// Drill-down: revenue by product → click a row → its transactions (R "drill-down
// functionality", 77.8% of survey respondents rated important).

import { useState } from "react";
import { nprCompact, useApi } from "@/lib/api";
import type { DimensionRow } from "@/lib/api";
import { apiParams, useFilters } from "@/lib/filters";
import { clsx } from "@/lib/cx";
import TransactionsTable from "./TransactionsTable";
import { EmptyState, PanelError, PanelSkeleton } from "./Status";

export default function SalesExplorer() {
  const { filters } = useFilters();
  const [selectedSku, setSelectedSku] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const { data, error, loading } = useApi<DimensionRow[]>(
    "/sales/by-product",
    apiParams(filters),
  );

  if (error) return <PanelError message={error} />;
  if (loading || !data) return <PanelSkeleton className="h-72" />;
  if (data.length === 0) return <EmptyState />;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-ink-muted">
              <th className="pb-3 font-medium">Product</th>
              <th className="pb-3 text-right font-medium">Orders</th>
              <th className="pb-3 text-right font-medium">Revenue</th>
              <th className="pb-3 text-right font-medium">Share</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.slice(0, 10).map((r) => (
              <tr
                key={r.sku ?? r.key}
                onClick={() => {
                  setSelectedSku(r.sku ?? undefined);
                  setPage(1);
                }}
                className={clsx(
                  "cursor-pointer transition-colors hover:bg-bg-soft",
                  selectedSku === r.sku && "bg-primary/5",
                )}
              >
                <td className="py-3 font-medium text-ink">{r.key}</td>
                <td className="py-3 text-right font-mono text-ink-soft">{r.orders}</td>
                <td className="py-3 text-right font-mono text-ink">{nprCompact(r.revenue)}</td>
                <td className="py-3 text-right font-mono text-ink-soft">{r.share_pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-ink-muted">
          Click a product to drill into its transactions.
        </p>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-ink">
          {selectedSku ? `Transactions — ${selectedSku}` : "All transactions"}
        </p>
        <TransactionsTable sku={selectedSku} page={page} onPage={setPage} pageSize={8} />
      </div>
    </div>
  );
}
