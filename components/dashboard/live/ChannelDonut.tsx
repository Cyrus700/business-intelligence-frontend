"use client";

import { nprCompact, useApi } from "@/lib/api";
import type { DimensionRow } from "@/lib/api";
import { apiParams, useFilters } from "@/lib/filters";
import DonutSources from "../charts/DonutSources";
import { EmptyState, PanelError, PanelSkeleton } from "./Status";

const LABELS: Record<string, string> = {
  store: "Store",
  online: "Online",
  distributor: "Distributor",
};

export default function ChannelDonut() {
  const { filters, addMultiDimension, removeMultiDimension } = useFilters();
  const { data, error, loading } = useApi<DimensionRow[]>(
    "/sales/by-channel",
    apiParams(filters),
  );

  if (error) return <PanelError message={error} />;
  if (loading || !data) return <PanelSkeleton className="h-[200px]" />;
  if (data.length === 0) return <EmptyState />;

  const total = data.reduce((s, r) => s + r.revenue, 0);
  const active = (filters.channels ?? [])[0];
  const toggle = (channel: string) => {
    if ((filters.channels ?? []).includes(channel)) {
      removeMultiDimension("channels", channel);
    } else {
      addMultiDimension("channels", channel);
    }
  };

  return (
    <DonutSources
      data={data.map((r) => ({
        name: LABELS[r.key] ?? r.key,
        value: r.revenue,
        share: r.share_pct,
      }))}
      centerLabel={nprCompact(total)}
      centerSub="revenue"
      onSliceClick={(name) => {
        const raw = data.find((r) => (LABELS[r.key] ?? r.key) === name)?.key ?? name;
        toggle(raw);
      }}
      activeSlice={active ? LABELS[active] ?? active : undefined}
    />
  );
}