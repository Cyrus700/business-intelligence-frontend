import { clsx } from "@/lib/cx";

export default function Panel({
  title,
  subtitle,
  action,
  className,
  bodyClassName,
  children,
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={clsx(
        "rounded-2xl border border-border bg-white shadow-card",
        className,
      )}
    >
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 border-b border-border px-5 py-4 sm:px-6">
          <div className="min-w-0">
            {title && <h3 className="font-semibold tracking-tight text-ink">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={clsx("p-5 sm:p-6", bodyClassName)}>{children}</div>
    </section>
  );
}
