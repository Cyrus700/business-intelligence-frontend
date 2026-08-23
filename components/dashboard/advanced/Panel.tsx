"use client";

import { ReactNode } from "react";

export default function Panel({
  title,
  subtitle,
  children,
  controls,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  controls?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {subtitle && <p className="text-xs text-ink-muted">{subtitle}</p>}
        </div>
        {controls}
      </header>
      <div>{children}</div>
    </section>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return <div className="flex h-40 items-center justify-center text-sm text-ink-muted">{label}</div>;
}

export function Empty({ label = "No data" }: { label?: string }) {
  return <div className="flex h-40 items-center justify-center text-sm text-ink-muted">{label}</div>;
}
