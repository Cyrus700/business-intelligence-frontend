"use client";

import { useState } from "react";
import SearchInput from "@/components/ui/SearchInput";
import TransactionsTable from "./TransactionsTable";

export default function PagedTransactions() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  function handleSearch(v: string) {
    setSearch(v);
    setPage(1);
  }

  return (
    <div>
      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={handleSearch}
          placeholder="Search by product, customer or channel…"
        />
      </div>
      <TransactionsTable page={page} onPage={setPage} pageSize={15} search={search} />
    </div>
  );
}
