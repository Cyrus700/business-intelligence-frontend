"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  DUR,
  EASE,
  drawPath,
  parallax,
  prefersReducedMotion,
} from "@/lib/motion";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import LiveDashboard from "@/components/ui/LiveDashboard";
import Icon from "@/components/ui/Icon";
import Skeleton from "@/components/ui/Skeleton";
import { useLandingLive, relativeTime } from "@/lib/landing-api";
import { clsx } from "@/lib/cx";

export default function DashboardPreview() {
  const root = useRef<HTMLDivElement>(null);
  const { data: live } = useLandingLive();

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const q = gsap.utils.selector(root);
      const reduce = prefersReducedMotion();

      if (reduce) {
        gsap.set(q("[data-preview], [data-side]"), { opacity: 1, y: 0, scale: 1 });
        return;
      }

      gsap.from(q("[data-preview]"), {
        y: 64,
        scale: 0.95,
        opacity: 0,
        duration: DUR.slow,
        ease: EASE.expo,
        scrollTrigger: { trigger: el, start: "top 78%", once: true },
      });

      gsap.from(q("[data-side]"), {
        x: 32,
        opacity: 0,
        duration: DUR.base,
        ease: EASE.out,
        stagger: 0.12,
        scrollTrigger: { trigger: el, start: "top 72%", once: true },
      });

      const drift = q("[data-preview-drift]")[0];
      if (drift) parallax(drift, 36, el);

      gsap.from(q("[data-dim-bar]"), {
        scaleX: 0,
        transformOrigin: "left",
        duration: 0.8,
        ease: EASE.out,
        stagger: 0.08,
        scrollTrigger: { trigger: el, start: "top 70%", once: true },
      });
    },
    { scope: root, dependencies: [live] },
  );

  // Redraw the chart line whenever the panel receives fresh data.
  useGSAP(
    () => {
      const el = root.current;
      if (!el || !live) return;
      const line = el.querySelector<SVGPathElement>(".chart-line");
      if (line) drawPath(line, { trigger: el });
    },
    { scope: root, dependencies: [live] },
  );

  const model = live?.model;
  const insight = live?.insight;
  const p = live?.pipeline;
  const statuses = Object.entries(p?.by_status ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <section className="relative overflow-hidden py-24 md:py-32">
      <div className="dot-grid pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <Container>
        <SectionHeading
          eyebrow="The dashboard"
          title={
            <>
              Built to be read <span className="text-gradient">at a glance</span>
            </>
          }
          subtitle="A live look at the real platform — warehouse scale, pipeline health and AI output, exactly what your team opens every morning."
        />

        <div
          ref={root}
          className="mt-16 grid items-start gap-6 lg:grid-cols-[1.45fr_1fr]"
        >
          <div data-preview className="will-change-transform">
            <div data-preview-drift>
              <LiveDashboard live={live} className="shadow-hero" />
            </div>
          </div>

          <div className="grid gap-4">
            {/* The AI layer keeps working in the background, writing insights. */}
            <article
              data-side
              className="surface-ring rounded-2xl border border-border bg-white p-6 shadow-card"
            >
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-50 text-primary">
                  <Icon name="spark" className="h-4 w-4" />
                </span>
                <h3 className="text-sm font-semibold text-ink">AI insight engine</h3>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-xs text-ink-muted">Insights written</dt>
                  <dd className="font-mono font-semibold text-ink">
                    {live
                      ? live.totals.insights.toLocaleString("en-IN")
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Latest type</dt>
                  <dd className="font-mono font-semibold text-ink">
                    {insight?.type?.replace(/_/g, " ") ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Generated</dt>
                  <dd className="font-mono font-semibold text-ink">
                    {relativeTime(insight?.generated_at ?? null)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Forecast points</dt>
                  <dd className="font-mono font-semibold text-ink">
                    {live
                      ? live.totals.forecast_points.toLocaleString("en-IN")
                      : "—"}
                  </dd>
                </div>
              </dl>
            </article>

            {/* Model card — the champion model, without business metrics. */}
            <article
              data-side
              className="rounded-2xl border border-border bg-white p-6 shadow-card"
            >
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-50 text-accent">
                  <Icon name="trend" className="h-4 w-4" />
                </span>
                <h3 className="text-sm font-semibold text-ink">Active model</h3>
                {model && (
                  <span
                    className={clsx(
                      "ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      model.is_active
                        ? "bg-accent-50 text-accent"
                        : "bg-bg-soft text-ink-muted",
                    )}
                  >
                    {model.is_active ? "Active" : "Idle"}
                  </span>
                )}
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-xs text-ink-muted">Champion</dt>
                  <dd className="font-mono font-semibold text-ink">
                    {model?.model_type ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Version</dt>
                  <dd className="font-mono font-semibold text-ink">
                    {model ? `v${model.version}` : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Trained</dt>
                  <dd className="font-mono font-semibold text-ink">
                    {model?.trained_at
                      ? new Date(model.trained_at).toLocaleDateString("en-GB", {
                          dateStyle: "medium",
                        })
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Models trained</dt>
                  <dd className="font-mono font-semibold text-ink">
                    {live
                      ? live.totals.models_trained.toLocaleString("en-IN")
                      : "—"}
                  </dd>
                </div>
              </dl>
            </article>

            {/* ETL pipeline — real run history, no business figures. */}
            <article
              data-side
              className="rounded-2xl border border-border bg-white p-6 shadow-card"
            >
              <h3 className="text-sm font-semibold text-ink">
                ETL pipeline
                <span className="ml-2 text-xs font-normal text-ink-muted">
                  {p?.last_run_at ? `last run ${relativeTime(p.last_run_at)}` : null}
                </span>
              </h3>
              <div className="mt-4 grid gap-3">
                {live ? (
                  statuses.map(([key, n]) => {
                    const total = statuses.reduce((s, [, v]) => s + v, 0) || 1;
                    return (
                      <div key={key}>
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="font-medium capitalize text-ink-soft">
                            {key.replace(/_/g, " ")}
                          </span>
                          <span className="font-mono tabular-nums text-ink-muted">
                            {n} runs · {Math.round((n / total) * 100)}%
                          </span>
                        </div>
                        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-bg-soft">
                          <span
                            data-dim-bar
                            style={{ width: `${(n / total) * 100}%` }}
                            className="block h-full origin-left rounded-full bg-gradient-to-r from-primary to-sky"
                          />
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                      <Skeleton key={i} className="h-3 w-full" />
                    ))}
                  </div>
                )}
              </div>
            </article>
          </div>
        </div>
      </Container>
    </section>
  );
}
