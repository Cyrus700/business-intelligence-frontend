"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { marquee } from "@/lib/motion";
import { useLandingLive } from "@/lib/landing-api";
import { nprCompact } from "@/lib/api";

// A single continuous strip of real platform figures. It sits between the hero
// and the feature grid to make the "this is wired to a real warehouse" claim
// before the marketing copy starts.

export default function LiveTicker() {
  const track = useRef<HTMLDivElement>(null);
  const { data: live } = useLandingLive();

  const items = live
    ? [
        `${live.totals.records_unified.toLocaleString("en-IN")} rows unified`,
        `${nprCompact(live.totals.revenue)} revenue analysed`,
        `${live.totals.orders.toLocaleString("en-IN")} orders processed`,
        `${live.totals.kpi_points.toLocaleString("en-IN")} KPI points computed`,
        `${live.totals.forecast_points} forecast points`,
        `${live.totals.models_trained} ML models trained`,
        `${live.totals.anomalies_total} anomalies detected`,
        `${live.totals.insights} AI insights written`,
        `${live.totals.etl_jobs} ETL runs · ${live.pipeline.success_rate_pct}% success`,
        `${live.totals.products} products · ${live.totals.customers} customers`,
      ]
    : [];

  useGSAP(
    () => {
      const el = track.current;
      if (!el || items.length === 0) return;
      marquee(el, 44);
    },
    { scope: track, dependencies: [live] },
  );

  if (items.length === 0) return null;

  return (
    <section
      aria-label="Live platform metrics"
      className="border-y border-border bg-white/70 py-4 backdrop-blur"
    >
      <div className="edge-fade overflow-hidden">
        {/* Two identical halves so the -50% loop is seamless. */}
        <div ref={track} className="flex w-max items-center">
          {[0, 1].map((half) => (
            <div key={half} className="flex items-center" aria-hidden={half === 1}>
              {items.map((item) => (
                <span
                  key={`${half}-${item}`}
                  className="flex items-center gap-3 whitespace-nowrap px-6 text-sm text-ink-soft"
                >
                  <span className="h-1 w-1 rounded-full bg-primary/50" />
                  <span className="font-mono tabular-nums">{item}</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
