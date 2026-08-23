"use client";

import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import type { PbDim, PbFilters } from "@/lib/advanced";

type PbCtx = PbFilters & {
  setDate: (from: string, to: string) => void;
  setDim: (dim: PbDim, value: string | null) => void;
  toggleDim: (dim: PbDim, value: string) => void;
  clearAll: () => void;
  activeCount: number;
};

const Ctx = createContext<PbCtx | null>(null);

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 89);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(from), to: iso(to) };
}

export function PbFilterProvider({ children }: { children: ReactNode }) {
  const d = defaultRange();
  const [from, setFrom] = useState(d.from);
  const [to, setTo] = useState(d.to);
  const [region, setRegion] = useState<string | null>(null);
  const [channel, setChannel] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);

  const value = useMemo<PbCtx>(() => {
    const dims = { region, channel, category };
    const setters: Record<PbDim, (v: string | null) => void> = { region: setRegion, channel: setChannel, category: setCategory };
    return {
      from,
      to,
      region,
      channel,
      category,
      setDate: (f, t) => {
        setFrom(f);
        setTo(t);
      },
      setDim: (dim, v) => setters[dim](v),
      toggleDim: (dim, v) => setters[dim](dims[dim] === v ? null : v),
      clearAll: () => {
        setRegion(null);
        setChannel(null);
        setCategory(null);
      },
      activeCount: [region, channel, category].filter(Boolean).length,
    };
  }, [from, to, region, channel, category]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePbFilters(): PbCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePbFilters must be used within PbFilterProvider");
  return v;
}
