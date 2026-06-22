import { clsx } from "@/lib/cx";
import { AI_INSIGHTS } from "@/lib/dashboard-data";
import Icon from "@/components/ui/Icon";

const TONE: Record<string, string> = {
  accent: "bg-accent-50 text-accent",
  warn: "bg-warn-50 text-warn",
  primary: "bg-primary-50 text-primary",
};

export default function AiInsights() {
  return (
    <ul className="space-y-3">
      {AI_INSIGHTS.map((it) => (
        <li key={it.title} className="flex gap-3 rounded-xl border border-border p-3.5">
          <span className={clsx("grid h-9 w-9 shrink-0 place-items-center rounded-lg", TONE[it.tone])}>
            <Icon name="spark" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-medium text-ink">{it.title}</p>
            <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">{it.body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
