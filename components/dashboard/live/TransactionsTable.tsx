"use client";

import { npr, useApi } from "@/lib/api";
import type { Paginated, TransactionRow } from "@/lib/api";
import { apiParams, useFilters } from "@/lib/filters";
import { EmptyState, PanelError, PanelSkeleton } from "./Status";

type SortBy = "txn_date" | "product" | "channel" | "region" | "quantity" | "total_amount" | "ingested_at";
type SortDir = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 text-ink-muted/40">↕</span>;
  return <span className="ml-1 text-primary">{dir === "asc" ? "↑" : "↓"}</span>;
}

function WorkerBadge({ row }: { row: TransactionRow }) {
  const ing = row.ingested_at ? new Date(row.ingested_at as string) : null;
  const rel = ing ? (() => {
    const diff = Date.now() - ing.getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h/24)}d ago`;
  })() : "—";
  return (
    <span className="inline-flex items-center gap-1.5" title={ing ? `Ingested ${ing.toLocaleString()} · job ${row.etl_job_id?.slice(0,8) ?? "—"}` : "No worker info"}>
      <span className={`h-1.5 w-1.5 rounded-full ${row.etl_job_id ? "bg-emerald-500" : "bg-zinc-300"}`} />
      <span className="font-mono text-[11px] text-ink-muted">{rel}</span>
      {row.etl_job_id && <span className="hidden rounded bg-bg-soft px-1 py-0.5 font-mono text-[10px] text-ink-muted sm:inline">{row.etl_job_id.slice(0, 8)}</span>}
    </span>
  );
}

export default function TransactionsTable({
  sku,
  search,
  pageSize = 15,
  page = 1,
  onPage,
  sortBy,
  sortDir,
  onSort,
}: {
  sku?: string;
  search?: string;
  pageSize?: number;
  page?: number;
  onPage?: (p: number) => void;
  sortBy?: SortBy;
  sortDir?: SortDir;
  onSort?: (col: SortBy) => void;
}) {
  const { filters } = useFilters();
  const params: Record<string, string | number | boolean | undefined> = {
    ...apiParams(filters),
    sku,
    page,
    page_size: pageSize,
    sort_by: sortBy,
    sort_dir: sortDir,
  };
  if (search) params.search = search;
  const { data, error, loading } = useApi<Paginated<TransactionRow>>("/sales/transactions", params);

  if (error) return <PanelError message={error} />;
  if (loading || !data) return <PanelSkeleton className="h-64" />;
  if (data.items.length === 0) return <EmptyState />;

  const pages = Math.max(1, Math.ceil(data.total / data.page_size));
  const isSorted = (col: SortBy) => sortBy === col;

  function handleHeader(col: SortBy) {
    if (!onSort) return;
    onSort(col);
  }

  function exportCsv() {
    if (!data) return;
    const headers = ["Date","Product","Customer","Channel","Region","Qty","Amount","Ingested","Job"];
    const rows = data.items.map(r => [
      r.txn_date,
      r.product ?? r.sku ?? "",
      r.customer ?? "",
      r.channel ?? "",
      r.region ?? "",
      String(r.quantity),
      String(r.total_amount),
      r.ingested_at ? new Date(r.ingested_at as string).toLocaleString() : "",
      r.etl_job_id ?? "",
    ]);
    const csv = [headers, ...rows].map(a => a.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-ink-muted">
          <span className="font-medium text-ink">{data.total.toLocaleString()}</span> transactions · sorted by <span className="font-medium text-ink">{sortBy ?? "txn_date"}</span> {sortDir ?? "desc"}
        </span>
        <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium hover:bg-bg-soft">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} className="h-3.5 w-3.5"><path d="M12 16V4M12 16l4-4M12 16l-4-4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" /></svg>
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full min-w-[820px] text-left text-sm">
          <caption className="sr-only">Recent transactions — worker-tracked</caption>
          <thead className="bg-bg-soft/60">
            <tr className="text-xs uppercase tracking-wide text-ink-muted">
              <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">
                <button onClick={() => handleHeader("txn_date")} className="inline-flex items-center hover:text-ink">Date<SortIcon active={isSorted("txn_date")} dir={sortDir ?? "desc"} /></button>
              </th>
              <th scope="col" className="whitespace-nowrap px-2 py-3 font-medium">
                <button onClick={() => handleHeader("product")} className="inline-flex items-center hover:text-ink">Product<SortIcon active={isSorted("product")} dir={sortDir ?? "desc"} /></button>
              </th>
              <th scope="col" className="whitespace-nowrap px-2 py-3 font-medium hidden lg:table-cell">
                <button onClick={() => handleHeader("region")} className="inline-flex items-center hover:text-ink">Region<SortIcon active={isSorted("region")} dir={sortDir ?? "desc"} /></button>
              </th>
              <th scope="col" className="whitespace-nowrap px-2 py-3 font-medium">
                <button onClick={() => handleHeader("channel")} className="inline-flex items-center hover:text-ink">Channel<SortIcon active={isSorted("channel")} dir={sortDir ?? "desc"} /></button>
              </th>
              <th scope="col" className="whitespace-nowrap px-2 py-3 text-right font-medium">
                <button onClick={() => handleHeader("quantity")} className="inline-flex items-center gap-1 hover:text-ink">Qty<SortIcon active={isSorted("quantity")} dir={sortDir ?? "desc"} /></button>
              </th>
              <th scope="col" className="whitespace-nowrap px-2 py-3 text-right font-medium">
                <button onClick={() => handleHeader("total_amount")} className="inline-flex items-center gap-1 hover:text-ink">Amount<SortIcon active={isSorted("total_amount")} dir={sortDir ?? "desc"} /></button>
              </th>
              <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">
                <button onClick={() => handleHeader("ingested_at")} className="inline-flex items-center hover:text-ink">Worker<SortIcon active={isSorted("ingested_at")} dir={sortDir ?? "desc"} /></button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.items.map((t) => (
              <tr key={t.id} className="group transition-colors hover:bg-primary/[0.03]">
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink-soft">
                  <span className="font-medium text-ink">{t.txn_date as string}</span>
                  <span className="ml-2 hidden text-[11px] text-ink-muted sm:inline">{t.customer ?? "—"}</span>
                </td>
                <td className="px-2 py-3 font-medium text-ink max-w-[180px] truncate">{t.product ?? t.sku ?? "—"}</td>
                <td className="hidden px-2 py-3 text-ink-soft lg:table-cell">
                  <span className="inline-flex rounded-full bg-white px-2 py-0.5 text-xs ring-1 ring-border">{t.region ?? "—"}</span>
                </td>
                <td className="px-2 py-3 text-ink-soft">
                  <span className="inline-flex rounded-full bg-bg-soft px-2 py-0.5 text-xs">{t.channel ?? "—"}</span>
                </td>
                <td className="px-2 py-3 text-right font-mono text-ink">{t.quantity}</td>
                <td className="px-2 py-3 text-right font-mono font-medium text-ink">{t.redacted ? "•••" : npr(t.total_amount as number)}</td>
                <td className="px-4 py-3"><WorkerBadge row={t} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {onPage && pages > 1 && (
        <div className="mt-4 flex flex-col items-start justify-between gap-3 border-t border-border pt-4 text-sm text-ink-soft sm:flex-row sm:items-center">
          <span className="text-xs">
            Page <span className="font-medium text-ink">{data.page}</span> of {pages} · <span className="font-medium text-ink">{data.total.toLocaleString()}</span> total
            <span className="ml-2 hidden text-ink-muted sm:inline">· professional worker-tracked · p95 {data.page_size} rows</span>
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => onPage(page - 1)}
              className="rounded-full border border-border bg-white px-3.5 py-1.5 text-xs font-medium hover:bg-bg-soft disabled:opacity-40"
            >
              Prev
            </button>
            <span className="grid h-8 min-w-[56px] place-items-center rounded-full bg-ink px-3 text-xs font-medium text-white">{page} / {pages}</span>
            <button
              disabled={page >= pages}
              onClick={() => onPage(page + 1)}
              className="rounded-full border border-border bg-white px-3.5 py-1.5 text-xs font-medium hover:bg-bg-soft disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
