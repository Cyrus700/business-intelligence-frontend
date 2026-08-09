"use client";

import { useApi } from "@/lib/api";

export type LandingStat = {
  value: number;
  suffix: string;
  prefix?: string;
  label: string;
};

export type LandingFeature = {
  icon: string;
  title: string;
  body: string;
};

export type LandingStep = {
  no: string;
  title: string;
  body: string;
};

export type LandingPricingTier = {
  name: string;
  price: string;
  period: string;
  blurb: string;
  features: string[];
  cta: string;
  featured: boolean;
};

export type LandingFaq = {
  q: string;
  a: string;
};

export type LandingData = {
  hero: {
    eyebrow: string;
    title: string[];
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
  };
  stats: LandingStat[];
  features: LandingFeature[];
  steps: LandingStep[];
  pricing: LandingPricingTier[];
  faqs: LandingFaq[];
};

export function useLandingData() {
  return useApi<LandingData>("/landing", undefined, ["landing"]);
}

// ── Live warehouse metrics (GET /landing/live) ────────────────────
// Real aggregates from the BI warehouse — the landing page renders these
// instead of invented numbers. Public endpoint, so aggregates only.

export type LiveMonth = {
  month: string; // "2026-07"
  revenue: number;
  orders: number;
  expenses: number;
  net: number;
  /** Trailing month still in progress — never chart it as a real decline. */
  partial: boolean;
};

export type LiveForecast = {
  month: string;
  yhat: number;
  lower: number;
  upper: number;
  days: number;
};

export type LiveDimension = {
  key: string;
  revenue: number;
  share_pct: number;
};

export type LandingLive = {
  generated_at: string;
  coverage: { from: string | null; to: string | null };
  totals: {
    records_unified: number;
    orders: number;
    revenue: number;
    expenses: number;
    products: number;
    customers: number;
    data_sources: number;
    etl_jobs: number;
    kpi_points: number;
    forecast_points: number;
    models_trained: number;
    anomalies_total: number;
    anomalies_open: number;
    insights: number;
  };
  kpis: {
    window_days: number;
    period_start: string;
    period_end: string;
    revenue: number;
    revenue_change_pct: number | null;
    orders: number;
    orders_change_pct: number | null;
    avg_order_value: number;
    avg_order_value_change_pct: number | null;
    expenses: number;
    expenses_change_pct: number | null;
    net: number;
    net_change_pct: number | null;
    net_margin_pct: number | null;
  };
  revenue_series: LiveMonth[];
  forecast_series: LiveForecast[];
  regions: LiveDimension[];
  channels: LiveDimension[];
  anomaly: {
    metric: string;
    severity: string;
    status: string;
    observed_value: number;
    expected_value: number | null;
    deviation_score: number | null;
    detected_at: string | null;
  } | null;
  insight: {
    type: string;
    title: string;
    body: string;
    severity: string;
    generated_at: string | null;
  } | null;
  model: {
    model_type: string;
    target: string;
    version: number;
    training_rows: number | null;
    metrics: Record<string, unknown>;
    is_active: boolean;
    trained_at: string | null;
  } | null;
  pipeline: {
    by_status: Record<string, number>;
    success_rate_pct: number;
    last_run_at: string | null;
  };
};

export function useLandingLive() {
  return useApi<LandingLive>("/landing/live", undefined, ["landing", "live"]);
}

// ── Derived helpers shared by the landing visuals ─────────────────

/** Complete months only — drops the in-flight trailing month. */
export function settledMonths(series: LiveMonth[] | undefined): LiveMonth[] {
  return (series ?? []).filter((m) => !m.partial);
}

/** "2026-07" → "Jul" for compact chart axes. */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return new Date(y, m - 1, 1).toLocaleString("en", { month: "short" });
}

/** Model MAPE → an accuracy percentage, clamped to a sane 0–100. */
export function modelAccuracyPct(live: LandingLive | null): number | null {
  const mape = live?.model?.metrics?.mape;
  if (typeof mape !== "number") return null;
  return Math.max(0, Math.min(100, Math.round((100 - mape) * 10) / 10));
}
