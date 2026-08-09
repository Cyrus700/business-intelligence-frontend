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
import { useLandingLive } from "@/lib/landing-api";
import { nprCompact } from "@/lib/api";

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
          subtitle="This is the real panel, wired to the live warehouse — the same KPIs, forecast band and anomaly feed your team would open every morning."
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
            {/* The most recent insight the AI layer actually wrote. */}
            <article
              data-side
              className="surface-ring rounded-2xl border border-border bg-white p-6 shadow-card"
            >
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-50 text-primary">
                  <Icon name="spark" className="h-4 w-4" />
                </span>
                <h3 className="text-sm font-semibold text-ink">Latest AI insight</h3>
                {insight && (
                  <span className="ml-auto rounded-full bg-warn-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warn">
                    {insight.severity}
                  </span>
                )}
              </div>
              {insight ? (
                <>
                  <p className="mt-4 text-sm font-semibold text-ink">{insight.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    {insight.body}
                  </p>
                </>
              ) : (
                <div className="mt-4 space-y-2">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-bg-soft" />
                  <div className="h-3 w-full animate-pulse rounded bg-bg-soft" />
                  <div className="h-3 w-5/6 animate-pulse rounded bg-bg-soft" />
                </div>
              )}
            </article>

            {/* Model card — the real champion model and its holdout scores. */}
            <article
              data-side
              className="rounded-2xl border border-border bg-white p-6 shadow-card"
            >
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-50 text-accent">
                  <Icon name="trend" className="h-4 w-4" />
                </span>
                <h3 className="text-sm font-semibold text-ink">Active model</h3>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-xs text-ink-muted">Champion</dt>
                  <dd className="font-mono font-semibold text-ink">
                    {model?.model_type ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Target</dt>
                  <dd className="font-mono font-semibold text-ink">
                    {model?.target.replace(/_/g, " ") ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Trained on</dt>
                  <dd className="font-mono font-semibold text-ink">
                    {model?.training_rows?.toLocaleString("en-IN") ?? "—"} rows
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Holdout MAPE</dt>
                  <dd className="font-mono font-semibold text-ink">
                    {typeof model?.metrics?.mape === "number"
                      ? `${(model.metrics.mape as number).toFixed(1)}%`
                      : "—"}
                  </dd>
                </div>
              </dl>
            </article>

            {/* Revenue split by sales channel — trailing 90 days, real. */}
            <article
              data-side
              className="rounded-2xl border border-border bg-white p-6 shadow-card"
            >
              <h3 className="text-sm font-semibold text-ink">
                Revenue by channel
                <span className="ml-2 text-xs font-normal text-ink-muted">
                  last 90 days
                </span>
              </h3>
              <div className="mt-4 grid gap-3">
                {(live?.channels ?? []).map((c) => (
                  <div key={c.key}>
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-medium capitalize text-ink-soft">
                        {c.key}
                      </span>
                      <span className="font-mono tabular-nums text-ink-muted">
                        {nprCompact(c.revenue)} · {c.share_pct}%
                      </span>
                    </div>
                    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-bg-soft">
                      <span
                        data-dim-bar
                        style={{ width: `${c.share_pct}%` }}
                        className="block h-full origin-left rounded-full bg-gradient-to-r from-primary to-sky"
                      />
                    </span>
                  </div>
                ))}
                {!live && (
                  <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-3 animate-pulse rounded bg-bg-soft" />
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
