"use client";

import { npr, useApi } from "@/lib/api";
import type { Paginated, TransactionRow } from "@/lib/api";
import { apiParams, useFilters } from "@/lib/filters";
import { EmptyState, PanelError, PanelSkeleton } from "./Status";

export default function TransactionsTable({
  sku,
  search,
  pageSize = 8,
  page = 1,
  onPage,
}: {
  sku?: string;
  search?: string;
  pageSize?: number;
  page?: number;
  onPage?: (p: number) => void;
}) {
  const { filters } = useFilters();
  const params: Record<string, string | number | boolean | undefined> = {
    ...apiParams(filters),
    sku,
    page,
    page_size: pageSize,
  };
  if (search) params.search = search;
  const { data, error, loading } = useApi<Paginated<TransactionRow>>("/sales/transactions", params);

  if (error) return <PanelError message={error} />;
  if (loading || !data) return <PanelSkeleton className="h-64" />;
  if (data.items.length === 0) return <EmptyState />;

  const pages = Math.max(1, Math.ceil(data.total / data.page_size));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-ink-muted">
            <th className="whitespace-nowrap pb-3 font-medium">Date</th>
            <th className="whitespace-nowrap pb-3 font-medium">Product</th>
            <th className="whitespace-nowrap pb-3 font-medium">Customer</th>
            <th className="whitespace-nowrap pb-3 font-medium">Channel</th>
            <th className="whitespace-nowrap pb-3 text-right font-medium">Qty</th>
            <th className="whitespace-nowrap pb-3 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.items.map((t) => (
            <tr key={t.id} className="transition-colors hover:bg-bg-soft">
              <td className="py-3 font-mono text-ink-soft">{t.txn_date}</td>
              <td className="py-3 font-medium text-ink">{t.product ?? t.sku}</td>
              <td className="py-3 text-ink-soft">{t.customer ?? "—"}</td>
              <td className="py-3 text-ink-soft">{t.channel ?? "—"}</td>
              <td className="py-3 text-right font-mono text-ink">{t.quantity}</td>
              <td className="py-3 text-right font-mono text-ink">{npr(t.total_amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {onPage && pages > 1 && (
        <div className="mt-4 flex flex-col items-start justify-between gap-3 border-t border-border pt-4 text-sm text-ink-soft sm:flex-row sm:items-center">
          <span>
            Page {data.page} of {pages} · {data.total.toLocaleString()} transactions
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => onPage(page - 1)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-bg-soft disabled:opacity-40 disabled:pointer-events-none"
            >
              Prev
            </button>
            <button
              disabled={page >= pages}
              onClick={() => onPage(page + 1)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-bg-soft disabled:opacity-40 disabled:pointer-events-none"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
