// Typed client for the Advanced analytics + prediction endpoints.
// All calls thread the shared cross-filter state so every visual responds to
// the global cross-filters (date / region / channel / category).

"use client";

import { useApi } from "@/lib/api";

export type PbDim = "region" | "channel" | "category";

export type PbFilters = {
  from: string;
  to: string;
  region: string | null;
  channel: string | null;
  category: string | null;
};

export function pbParams(f: PbFilters): Record<string, string> {
  const p: Record<string, string> = { from: f.from, to: f.to };
  if (f.region) p.region = f.region;
  if (f.channel) p.channel = f.channel;
  if (f.category) p.category = f.category;
  return p;
}

// ── query keys ───────────────────────────────────────────────────────
export const pbKeys = {
  tree: (f: PbFilters, metric: string, hierarchy: string) => ["pb", "tree", metric, hierarchy, f],
  waterfall: (f: PbFilters, metric: string, dim: string) => ["pb", "waterfall", metric, dim, f],
  heatmap: (f: PbFilters, metric: string, r: string, c: string) => ["pb", "heatmap", metric, r, c, f],
  scatter: (f: PbFilters, dim: string, x: string, y: string, s: string) => ["pb", "scatter", dim, x, y, s, f],
  funnel: (f: PbFilters, metric: string, dim: string) => ["pb", "funnel", metric, dim, f],
  radar: (f: PbFilters, dim: string, metrics: string) => ["pb", "radar", dim, metrics, f],
  small: (f: PbFilters, metric: string, dim: string, g: string) => ["pb", "small", metric, dim, g, f],
  influencers: (f: PbFilters, target: string) => ["pb", "influencers", target, f],
  segmentation: (f: PbFilters, dim: string, n: number) => ["pb", "segmentation", dim, n, f],
  scenarios: (f: PbFilters, metric: string, h: number, n: number) => ["pb", "scenarios", metric, h, n, f],
  comparison: (f: PbFilters, metric: string) => ["pb", "comparison", metric, f],
};

// ── hooks ────────────────────────────────────────────────────────────
export function useDecompTree(f: PbFilters, metric: string, hierarchy: string) {
  return useApi<any>(`/advanced/decomposition-tree`, { ...pbParams(f), metric, hierarchy }, pbKeys.tree(f, metric, hierarchy));
}
export function useWaterfall(f: PbFilters, metric: string, dimension: string) {
  return useApi<any>(`/advanced/waterfall`, { ...pbParams(f), metric, dimension }, pbKeys.waterfall(f, metric, dimension));
}
export function useHeatmap(f: PbFilters, metric: string, rowDim: string, colDim: string) {
  return useApi<any>(`/advanced/heatmap`, { ...pbParams(f), metric, row_dim: rowDim, col_dim: colDim }, pbKeys.heatmap(f, metric, rowDim, colDim));
}
export function useScatter(f: PbFilters, dimension: string, x: string, y: string, size: string) {
  return useApi<any>(`/advanced/scatter`, { ...pbParams(f), dimension, x, y, size }, pbKeys.scatter(f, dimension, x, y, size));
}
export function useFunnel(f: PbFilters, metric: string, dimension: string) {
  return useApi<any>(`/advanced/funnel`, { ...pbParams(f), metric, dimension }, pbKeys.funnel(f, metric, dimension));
}
export function useRadar(f: PbFilters, dimension: string, metrics: string) {
  return useApi<any>(`/advanced/radar`, { ...pbParams(f), dimension, metrics }, pbKeys.radar(f, dimension, metrics));
}
export function useSmallMultiples(f: PbFilters, metric: string, dimension: string, granularity: string) {
  return useApi<any>(`/advanced/small-multiples`, { ...pbParams(f), metric, dimension, granularity }, pbKeys.small(f, metric, dimension, granularity));
}
export function useKeyInfluencers(f: PbFilters, target: string) {
  return useApi<any>(`/advanced/key-influencers`, { ...pbParams(f), target }, pbKeys.influencers(f, target));
}
export function useSegmentation(f: PbFilters, dimension: string, nClusters: number) {
  return useApi<any>(`/advanced/segmentation`, { ...pbParams(f), dimension, n_clusters: nClusters }, pbKeys.segmentation(f, dimension, nClusters));
}
export function useForecastScenarios(f: PbFilters, metric: string, horizon: number, nPaths: number) {
  return useApi<any>(`/advanced/forecast-scenarios`, { ...pbParams(f), metric, horizon, n_paths: nPaths }, pbKeys.scenarios(f, metric, horizon, nPaths));
}
export function useModelComparison(f: PbFilters, metric: string) {
  return useApi<any>(`/advanced/model-comparison`, { ...pbParams(f), metric }, pbKeys.comparison(f, metric));
}
