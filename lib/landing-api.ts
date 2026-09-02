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

// Landing copy changes rarely and every section subscribes to the same key — so
// it stays fresh for 30 minutes and never polls or refetches on focus. One
// request per visit, whatever the section count.
const LANDING_STALE_TIME = 30 * 60_000; // 30 min

export function useLandingData() {
  return useApi<LandingData>("/landing", undefined, ["landing"], undefined, {
    staleTime: LANDING_STALE_TIME,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });
}

// Live platform metrics are no longer fetched from the browser: app/page.tsx
// loads them on the server (lib/landing-live.ts) and passes them down, so the
// page ships with its real numbers instead of swapping them in after paint.
