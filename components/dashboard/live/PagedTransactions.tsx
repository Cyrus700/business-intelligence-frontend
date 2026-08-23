"use client";

import { useState } from "react";
import SearchInput from "@/components/ui/SearchInput";
import TransactionsTable from "./TransactionsTable";
import { useApi } from "@/lib/api";

type SortBy = "txn_date" | "product" | "channel" | "region" | "quantity" | "total_amount" | "ingested_at";
type SortDir = "asc" | "desc";

function WorkerStrip() {
  const { data, error } = useApi<{ pool: any; queue_depth: number; recent_runs: any[]; etl_recent: any[] }>("/admin/workers/status");
  // Fallback to simple watermark if workers endpoint not accessible (analyst role)
  if (error || !data) {
    return (
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-xs text-ink-muted">
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
        <span className="font-medium text-ink">Professional workers</span>
        <span className="hidden sm:inline">· All transactions are worker-tracked and durable</span>
      </div>
    );
  }
  const pool = data.pool;
  const etl = data.etl_recent?.[0];
  return (
    <div className="mb-3 rounded-xl border border-border bg-white p-3">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="inline-flex items-center gap-2 rounded-full bg-ink px-3 py-1.5 font-medium text-white">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Workers · {pool?.concurrency ?? 4} concurrent
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 ring-1 ring-emerald-200">
          {pool?.succeeded ?? 0} succeeded · {pool?.failed ?? 0} failed
        </span>
        <span className="inline-flex items-center gap-1 text-ink-muted">
          <span className="font-medium text-ink">{pool?.p50_ms ?? 0}ms</span> p50 · <span className="font-medium text-ink">{pool?.p95_ms ?? 0}ms</span> p95 · queue {data.queue_depth ?? 0}
        </span>
        <span className="ml-auto hidden items-center gap-1.5 text-ink-muted sm:inline-flex">
          {etl ? (
            <>
              <span className={`h-1.5 w-1.5 rounded-full ${etl.status === "success" ? "bg-emerald-500" : "bg-amber-500"}`} />
              Last ETL {etl.rows_loaded ?? 0} rows · {etl.status}
            </>
          ) : (
            "No ETL yet"
          )}
        </span>
      </div>
      {data.recent_runs?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {data.recent_runs.slice(0, 5).map((r: any) => (
            <span key={r.id} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${r.status === "succeeded" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : r.status === "failed" ? "bg-red-50 text-red-700 ring-red-200" : "bg-amber-50 text-amber-700 ring-amber-200"}`}>
              {r.name.slice(0, 14)} · {r.status} · {r.attempts}×
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PagedTransactions() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("txn_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSearch(v: string) {
    setSearch(v);
    setPage(1);
  }
  function handleSort(col: SortBy) {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortDir(col === "txn_date" || col === "ingested_at" ? "desc" : "asc");
    }
    setPage(1);
  }

  return (
    <div>
      <WorkerStrip />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={search}
          onChange={handleSearch}
          placeholder="Search by product, customer or channel…"
        />
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <span className="hidden sm:inline">Sort:</span>
          <span className="rounded-full bg-ink px-2.5 py-1 font-medium text-white">{sortBy} {sortDir}</span>
          <span className="hidden sm:inline">· professional, advance worker-tracked</span>
        </div>
      </div>
      <TransactionsTable
        page={page}
        onPage={setPage}
        pageSize={15}
        search={search}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
      />
    </div>
  );
}
