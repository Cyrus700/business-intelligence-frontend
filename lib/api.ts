// Typed client for the BI backend API (business-intelligence-backend).
// Auth: bearer token from localStorage ("insightful.token"), falling back to
// NEXT_PUBLIC_DEV_API_TOKEN — an interim bridge until Phase 6 wires Supabase
// Auth end-to-end (docs/plan/phase-6-security-rbac.md).

"use client";

import { useEffect, useState } from "react";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export function getToken(): string | null {
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem("insightful.token");
    if (stored) return stored;
  }
  return process.env.NEXT_PUBLIC_DEV_API_TOKEN ?? null;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }
  const token = getToken();
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, String(body.detail ?? res.statusText));
  }
  return res.json() as Promise<T>;
}

type ApiState<T> = { key: string; data: T | null; error: string | null };

/** Fetch-on-mount hook with loading/error state; refetches when params change. */
export function useApi<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
) {
  const key = JSON.stringify([path, params]);
  const [state, setState] = useState<ApiState<T>>({ key: "", data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    apiGet<T>(path, params)
      .then((data) => {
        if (!cancelled) setState({ key, data, error: null });
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setState({ key, data: null, error: e instanceof Error ? e.message : "Request failed" });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = state.key === key;
  return {
    data: current ? state.data : null,
    error: current ? state.error : null,
    loading: !current,
  };
}

// ---- response shapes (mirror app/schemas/analytics.py) ----

export type KpiCard = {
  metric: string;
  value: number;
  previous_value: number | null;
  change_pct: number | null;
};
export type KpiSummary = { period_start: string; period_end: string; cards: KpiCard[] };
export type TimeseriesPoint = { period: string; value: number };
export type Timeseries = { metric: string; granularity: string; points: TimeseriesPoint[] };
export type DimensionRow = {
  key: string;
  sku: string | null;
  quantity: number | null;
  orders: number;
  revenue: number;
  share_pct: number;
};
export type TransactionRow = {
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
export type Paginated<T> = { items: T[]; total: number; page: number; page_size: number };
export type InventoryRow = {
  sku: string;
  product: string;
  category: string | null;
  snapshot_date: string;
  quantity_on_hand: number;
  reorder_level: number;
  below_reorder: boolean;
  warehouse: string | null;
};

// ---- formatting ----

/** NPR with Nepali-style digit grouping (1,23,45,678). */
export function npr(value: number): string {
  return `रु ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value)}`;
}

export function nprCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e7) return `रु ${(value / 1e7).toFixed(1)} Cr`;
  if (abs >= 1e5) return `रु ${(value / 1e5).toFixed(1)} L`;
  if (abs >= 1e3) return `रु ${(value / 1e3).toFixed(0)}k`;
  return npr(value);
}
