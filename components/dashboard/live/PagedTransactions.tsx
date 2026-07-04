"use client";

import { useState } from "react";
import TransactionsTable from "./TransactionsTable";

export default function PagedTransactions() {
  const [page, setPage] = useState(1);
  return <TransactionsTable page={page} onPage={setPage} pageSize={15} />;
}
