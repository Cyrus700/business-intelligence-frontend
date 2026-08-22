"use client";

// Drill-down: revenue by product → click a row → its transactions (R "drill-down
// functionality", 77.8% of survey respondents rated important).

import { useState } from "react";
import { nprCompact, useApi } from "@/lib/api";
import type { DimensionRow } from "@/lib/api";
import { apiParams, useFilters } from "@/lib/filters";
import { clsx } from "@/lib/cx";
import Icon from "@/components/ui/Icon";
import SearchInput from "@/components/ui/SearchInput";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import TransactionsTable from "./TransactionsTable";
import { EmptyState, PanelError, PanelSkeleton } from "./Status";

export default function SalesExplorer() {
  const { filters } = useFilters();
  const [selectedSku, setSelectedSku] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  function handleSearch(v: string) {
    setSearch(v);
    setPage(1);
  }
  const { data, error, loading } = useApi<DimensionRow[]>(
    "/sales/by-product",
    apiParams(filters),
  );

  if (error) return <PanelError message={error} />;
  if (loading || !data) return <PanelSkeleton className="h-72" />;
  if (data.length === 0) return <EmptyState />;

  // The search box filters the product list itself, not just the transactions
  // drill-down on the right — previously it silently did nothing to this table.
  const needle = search.trim().toLowerCase();
  const filtered = needle
    ? data.filter(
        (r) => r.key.toLowerCase().includes(needle) || r.sku?.toLowerCase().includes(needle),
      )
    : data;

  function handleExportCsv() {
    const header = ["Product", "SKU", "Orders", "Revenue", "Share %"];
    const rows = filtered.map((r) => [r.key, r.sku ?? "", r.orders, r.revenue, r.share_pct]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products-${filters.from}-${filters.to}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <div>
        <div className="mb-3 flex items-center gap-2">
          <SearchInput
            value={search}
            onChange={handleSearch}
            placeholder="Search products…"
          />
          <button
            onClick={handleExportCsv}
            title="Export visible products as CSV"
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-medium text-ink hover:bg-bg-soft"
          >
            <Icon name="download" className="h-3.5 w-3.5" />
            CSV
          </button>
        </div>
        {filtered.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-ink-muted">
            No products match “{search}”.
          </div>
        ) : (
        <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-sm">
<caption className="sr-only">Top products by revenue</caption>
<caption className="sr-only">Top products by revenue</caption>
          <thead>
            <tr className="text-xs uppercase tracking-wide text-ink-muted">
              <th className="pb-3 font-medium" scope="col">Product</th>
              <th className="pb-3 text-right font-medium" scope="col">Orders</th>
              <th className="pb-3 text-right font-medium" scope="col">Revenue</th>
              <th className="pb-3 text-right font-medium" scope="col">Share</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.slice(0, 10).map((r) => (
              <tr
                key={r.sku ?? r.key}
                tabIndex={0}
                role="link"
                aria-label={`Drill into ${r.key} transactions`}
                onClick={() => {
                  setSelectedSku(r.sku ?? undefined);
                  setPage(1);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedSku(r.sku ?? undefined);
                    setPage(1);
                  }
                }}
                className={clsx(
                  "cursor-pointer transition-colors hover:bg-bg-soft focus:outline-none focus-visible:bg-bg-soft focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40",
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
        )}
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <Breadcrumbs
            items={[
              { label: "Products", onClick: selectedSku ? () => setSelectedSku(undefined) : undefined },
              ...(selectedSku ? [{ label: selectedSku }] : []),
            ]}
          />
          <span className="text-xs text-ink-muted">
            {filters.regions?.length || filters.channels?.length || filters.categories?.length
              ? "Filtered by active dimensions"
              : "All dimensions"}
          </span>
        </div>
        <p className="mb-3 text-xs text-ink-muted">
          {selectedSku
            ? `Showing transactions for ${selectedSku}. Use the breadcrumb to go back.`
            : "Click a product to drill into its transactions."}
        </p>
        <TransactionsTable sku={selectedSku} search={search} page={page} onPage={setPage} pageSize={8} />
      </div>
    </div>
  );
}
