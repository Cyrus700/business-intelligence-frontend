import { clsx } from "@/lib/cx";
import { ANOMALIES } from "@/lib/dashboard-data";

const SEV: Record<string, { dot: string; label: string }> = {
  high: { dot: "bg-warn", label: "High" },
  med: { dot: "bg-primary", label: "Medium" },
  low: { dot: "bg-ink-muted", label: "Low" },
};

export default function AnomalyFeed() {
  return (
    <ul className="space-y-1">
      {ANOMALIES.map((a) => {
        const sev = SEV[a.sev];
        return (
          <li
            key={a.title}
            className="flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-bg-soft"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className={clsx("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", sev.dot)} />
              <span className={clsx("relative inline-flex h-2.5 w-2.5 rounded-full", sev.dot)} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{a.title}</p>
              <p className="text-xs text-ink-muted">{sev.label} · {a.time}</p>
            </div>
            <span className="font-mono text-sm font-semibold text-warn">{a.value}</span>
          </li>
        );
      })}
    </ul>
  );
}
