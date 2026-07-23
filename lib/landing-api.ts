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
