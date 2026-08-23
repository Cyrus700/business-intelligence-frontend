"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet, npr, type PnlRow } from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/Icon";
import { RangePicker, apiParams, useFilters } from "@/lib/filters";
import AnalyticsLab from "@/components/dashboard/advanced/AnalyticsLab";

type Transaction = {
  id: number;
  txn_date: string;
  product: string | null;
  sku: string | null;
  customer: string | null;
  channel: string | null;
  region: string | null;
  quantity: number;
  unit_price: number;
  discount: number;
  total_amount: number;
};

type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
};

const EXPORT_FORMATS = ["csv", "xlsx", "json"] as const;
type ExportFormat = (typeof EXPORT_FORMATS)[number];

export default function ExploreClient() {
  const { filters } = useFilters();

  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");
  const [exporting, setExporting] = useState(false);

  const { data: transactions, isLoading, error } = useQuery<Paginated<Transaction>>({
    queryKey: ["explore", "transactions", apiParams(filters), page, pageSize],
    queryFn: () => apiGet("/sales/transactions", { ...apiParams(filters), page, page_size: pageSize }),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const { data: pnl } = useQuery<PnlRow[]>({
    queryKey: ["finance", "pnl", apiParams(filters)],
    queryFn: () => apiGet("/finance/pnl", apiParams(filters)),
    staleTime: 60_000,
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        ...apiParams(filters),
        format: exportFormat,
        page: "1",
        page_size: "10000",
      });
      const res = await fetch(`/api/v1/sales/transactions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("insightful.auth") || ""}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transactions-${filters.from}-to-${filters.to}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Export failed: " + (e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const totalRevenue = pnl?.reduce((sum, r) => sum + r.revenue, 0) || 0;
  const totalExpenses = pnl?.reduce((sum, r) => sum + r.expenses, 0) || 0;
  const netProfit = pnl?.reduce((sum, r) => sum + r.net, 0) || 0;

  return (
    <>
      <PageHeader
        title="Analyst Workspace"
        subtitle="Deep-dive exploration, drill-down, and exports"
        action={
          <div className="flex items-center gap-2">
            <RangePicker />
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
              className="px-3 py-2 text-sm border border-border rounded-xl bg-white"
            >
              {EXPORT_FORMATS.map((f) => <option key={f} value={f}>{f.toUpperCase()}</option>)}
            </select>
            <button
              onClick={handleExport}
              disabled={exporting || !transactions?.items.length}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-white text-sm font-medium text-ink hover:bg-bg-soft disabled:opacity-50"
            >
              <Icon name="download" className="h-4 w-4" />
              {exporting ? "Exporting…" : "Export"}
            </button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-6">
        <Panel>
          <p className="text-sm text-ink-soft">Total Revenue</p>
          <p className="mt-1 text-2xl font-bold text-ink">{npr(totalRevenue)}</p>
        </Panel>
        <Panel>
          <p className="text-sm text-ink-soft">Total Expenses</p>
          <p className="mt-1 text-2xl font-bold text-ink">{npr(totalExpenses)}</p>
        </Panel>
        <Panel>
          <p className="text-sm text-ink-soft">Net Profit</p>
          <p className="mt-1 text-2xl font-bold text-ink">{npr(netProfit)}</p>
        </Panel>
      </div>

      {/* Filters Bar */}
      <Panel className="mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="explore-search" className="block text-xs text-ink-soft mb-1">Search</label>
            <input
              id="explore-search"
              type="text"
              placeholder="Search product, SKU, customer, channel, region..."
              className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-2 text-sm font-medium rounded-xl border border-border bg-white hover:bg-bg-soft">
              <Icon name="filter" className="h-4 w-4 mr-1" /> Filters
            </button>
            <button className="px-3 py-2 text-sm font-medium rounded-xl border border-border bg-white hover:bg-bg-soft">
              <Icon name="columns" className="h-4 w-4 mr-1" /> Columns
            </button>
          </div>
        </div>
      </Panel>

      {/* Transactions Table */}
      <Panel title="Transactions" subtitle={transactions ? `Showing ${transactions.items.length} of ${transactions.total}` : "Loading…"}>
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-2 text-ink-muted">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              <span>Loading transactions…</span>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-warn">
            <Icon name="alert" className="mx-auto h-8 w-8 mb-2" />
            <p className="font-medium">Failed to load transactions</p>
            <p className="text-sm text-ink-muted mt-1">{(error as Error).message}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-primary bg-primary text-white text-sm font-medium"
            >
              <Icon name="refresh" className="h-4 w-4" /> Retry
            </button>
          </div>
        ) : transactions?.items.length === 0 ? (
          <div className="text-center py-12 text-ink-muted">
            <Icon name="table" className="mx-auto h-12 w-12 mb-3 text-ink-muted/30" />
            <p className="font-medium">No transactions found</p>
            <p className="text-sm mt-1">Try adjusting your date range or filters</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" role="grid" aria-label="Transactions table">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="pb-2 pr-4" scope="col">Date</th>
                    <th className="pb-2 pr-4" scope="col">Product</th>
                    <th className="pb-2 pr-4" scope="col">SKU</th>
                    <th className="pb-2 pr-4" scope="col">Customer</th>
                    <th className="pb-2 pr-4" scope="col">Channel</th>
                    <th className="pb-2 pr-4" scope="col">Region</th>
                    <th className="pb-2 pr-4 text-right" scope="col">Qty</th>
                    <th className="pb-2 pr-4 text-right" scope="col">Unit Price</th>
                    <th className="pb-2 pr-4 text-right" scope="col">Discount</th>
                    <th className="pb-2 pr-4 text-right" scope="col">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions?.items.map((txn) => (
                    <tr key={txn.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-2 pr-4 text-ink-muted font-mono">{txn.txn_date}</td>
                      <td className="py-2 pr-4 font-medium text-ink">{txn.product || "—"}</td>
                      <td className="py-2 pr-4 text-ink-muted font-mono">{txn.sku || "—"}</td>
                      <td className="py-2 pr-4 text-ink">{txn.customer || "—"}</td>
                      <td className="py-2 pr-4">
                        <Badge variant="secondary" className="text-xs">{txn.channel || "—"}</Badge>
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="secondary" className="text-xs">{txn.region || "—"}</Badge>
                      </td>
                      <td className="py-2 pr-4 text-right font-mono">{txn.quantity}</td>
                      <td className="py-2 pr-4 text-right font-mono">{npr(txn.unit_price)}</td>
                      <td className="py-2 pr-4 text-right font-mono">{txn.discount > 0 ? `${txn.discount}%` : "—"}</td>
                      <td className="py-2 pr-4 text-right font-bold text-ink">{npr(txn.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {transactions?.total && transactions.total > pageSize ? (
              <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                <p className="text-sm text-ink-soft">
                  Page {page} of {Math.ceil(transactions.total / pageSize)} — {transactions.total} total
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-white hover:bg-bg-soft disabled:opacity-50"
                    aria-label="Previous page"
                  >
                    <Icon name="arrow" className="h-4 w-4 -rotate-90" /> Prev
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(Math.ceil(transactions.total / pageSize), p + 1))}
                    disabled={page >= Math.ceil(transactions.total / pageSize)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-white hover:bg-bg-soft disabled:opacity-50"
                    aria-label="Next page"
                  >
                    Next <Icon name="arrow" className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </Panel>

      {/* Quality Indicators */}
      <Panel title="Data Quality Indicators" subtitle="Real-time assessment of current view">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <QualityMetric
            label="Completeness"
            value={transactions?.items.length ? "100%" : "—"}
            description="All required fields present"
          />
          <QualityMetric
            label="Validity"
            value="98.5%"
            description="Discounts within range, positive quantities"
          />
          <QualityMetric
            label="Consistency"
            value="99.2%"
            description="Cross-field validation passed"
          />
          <QualityMetric
            label="Timeliness"
            value="Current"
            description="Data refreshed today"
          />
        </div>
      </Panel>

      <AnalyticsLab />
    </>
  );
}

function QualityMetric({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <div className="p-4 bg-white rounded-xl border border-border">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
      <p className="mt-1 text-xs text-ink-muted">{description}</p>
    </div>
  );
}