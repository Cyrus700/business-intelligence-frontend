import { clsx } from "@/lib/cx";
import type { PlatformSnapshot } from "@/lib/landing-live";

// The product panel shown in the hero and the preview section.
//
// It renders whatever the server fetched from GET /landing/live — there is no
// placeholder-then-real swap and no "demo" mode. When the warehouse is
// unreachable, `live` is null and the panel shows what the product does instead
// of inventing figures.
//
// Only platform-scale plumbing is shown here: rows landed, sources connected,
// pipeline health. Business figures (revenue, orders, margins, forecasts) stay
// in the authenticated dashboard, since this panel is public.
//
// Animation hooks the parent drives:
//   [data-panel-row]  staggered entrance
//   [data-dim-bar]    width scale-in

const STATUS_META: Record<string, { label: string; bar: string; dot: string }> = {
  succeeded: { label: "Succeeded", bar: "bg-accent", dot: "bg-accent" },
  success: { label: "Succeeded", bar: "bg-accent", dot: "bg-accent" },
  completed: { label: "Succeeded", bar: "bg-accent", dot: "bg-accent" },
  failed: { label: "Failed", bar: "bg-danger", dot: "bg-danger" },
  error: { label: "Failed", bar: "bg-danger", dot: "bg-danger" },
  running: { label: "Running", bar: "bg-sky", dot: "bg-sky" },
  pending: { label: "Queued", bar: "bg-sky", dot: "bg-sky" },
  queued: { label: "Queued", bar: "bg-sky", dot: "bg-sky" },
};

function meta(key: string) {
  return (
    STATUS_META[key.toLowerCase()] ?? {
      label: key.replace(/_/g, " "),
      bar: "bg-ink-soft",
      dot: "bg-ink-soft",
    }
  );
}

function Shell({
  children,
  className,
  status,
}: {
  children: React.ReactNode;
  className?: string;
  status: React.ReactNode;
}) {
  return (
    <div
      className={clsx(
        "w-full overflow-hidden rounded-xl sm:rounded-2xl border border-border bg-white shadow-card",
        className,
      )}
    >
      <div
        data-panel-row
        className="flex items-center justify-between gap-3 border-b border-border bg-bg-soft/60 px-4 py-3 sm:px-5 sm:py-3.5"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="pulse-dot h-2 w-2 shrink-0 rounded-full bg-accent text-accent" />
          <span className="truncate text-[13px] font-semibold text-ink sm:text-sm">
            Platform overview
          </span>
        </div>
        {status}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

export default function LiveDashboard({
  live,
  lastRunLabel,
  className,
}: {
  live: PlatformSnapshot | null;
  /** Pre-formatted on the server so the label can't drift during hydration. */
  lastRunLabel?: string | null;
  className?: string;
}) {
  // No warehouse behind the page (or it timed out): say what the panel is for
  // rather than filling it with numbers nobody can verify.
  if (!live) {
    const capabilities = [
      { title: "One unified warehouse", body: "Spreadsheets, databases and APIs in a single place" },
      { title: "Automated ETL", body: "Scheduled pipelines that clean and load on their own" },
      { title: "AI on top", body: "Forecasts, anomaly alerts and written recommendations" },
    ];
    return (
      <Shell
        className={className}
        status={
          <span className="shrink-0 text-[11px] font-medium text-ink-muted">
            Your workspace
          </span>
        }
      >
        <div className="grid gap-2.5">
          {capabilities.map((c) => (
            <div
              key={c.title}
              data-panel-row
              className="rounded-lg border border-border/70 bg-bg-soft/50 px-3.5 py-3 sm:rounded-xl"
            >
              <p className="text-[13px] font-semibold leading-none text-ink">{c.title}</p>
              <p className="mt-1.5 text-[11px] leading-snug text-ink-muted sm:text-xs">{c.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-[11px] text-ink-muted">
          Connect your first source to see your own numbers here.
        </p>
      </Shell>
    );
  }

  const { totals, pipeline } = live;

  const tiles = [
    {
      label: "Rows unified",
      value: totals.records_unified.toLocaleString("en-IN"),
      caption: "sales · finance · inventory",
    },
    {
      label: "Sources connected",
      value: `${totals.data_sources}`,
      caption: "CSV · Excel · SQL · REST",
    },
    {
      label: "ETL success",
      value: `${pipeline.success_rate_pct}%`,
      caption: `${totals.etl_jobs.toLocaleString("en-IN")} runs`,
    },
  ];

  const statuses = Object.entries(pipeline.by_status ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const statusTotal = statuses.reduce((sum, [, n]) => sum + n, 0) || 1;

  return (
    <Shell
      className={className}
      status={
        <span className="shrink-0 text-[11px] text-ink-muted">
          {lastRunLabel ? `Updated ${lastRunLabel}` : "Live"}
        </span>
      }
    >
      <div data-panel-row className="grid grid-cols-3 gap-2 sm:gap-3">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="min-w-0 rounded-lg border border-border/70 bg-bg-soft/70 p-3 sm:rounded-xl"
          >
            <p className="truncate text-[10px] font-medium leading-none text-ink-muted sm:text-[11px]">
              {tile.label}
            </p>
            <p className="mt-2 truncate font-mono text-base font-semibold leading-none tabular-nums text-ink sm:text-lg lg:text-xl">
              {tile.value}
            </p>
            <p className="mt-1.5 truncate text-[10px] leading-none text-ink-muted sm:text-[11px]">
              {tile.caption}
            </p>
          </div>
        ))}
      </div>

      <div
        data-panel-row
        className="mt-3 rounded-lg border border-border/70 p-3 sm:mt-4 sm:rounded-xl"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-ink-soft">ETL pipeline health</span>
          <span className="flex flex-wrap items-center gap-2.5 text-[10px] leading-none text-ink-muted sm:gap-3">
            {statuses.map(([key, n]) => (
              <span key={key} className="flex items-center gap-1.5">
                <span className={clsx("h-1.5 w-1.5 shrink-0 rounded-full", meta(key).dot)} />
                <span className="tabular-nums">
                  {meta(key).label} · {n}
                </span>
              </span>
            ))}
          </span>
        </div>

        <div className="grid gap-2.5">
          {statuses.map(([key, n]) => (
            <div key={key} className="flex items-center gap-2.5 sm:gap-3">
              <span className="w-14 shrink-0 truncate text-[11px] font-medium text-ink-soft sm:w-16">
                {meta(key).label}
              </span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-soft">
                <span
                  data-dim-bar
                  style={{ width: `${(n / statusTotal) * 100}%` }}
                  className={clsx("block h-full origin-left rounded-full", meta(key).bar)}
                />
              </span>
              <span className="w-9 shrink-0 text-right font-mono text-[11px] tabular-nums text-ink-muted sm:w-10">
                {Math.round((n / statusTotal) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <p data-panel-row className="mt-3 text-center text-[10px] leading-none text-ink-muted sm:text-[11px]">
        Platform totals only — business data stays inside your workspace.
      </p>
    </Shell>
  );
}
