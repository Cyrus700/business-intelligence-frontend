import Icon from "@/components/ui/Icon";

/** Breadcrumb trail for drill-down navigation. Ancestors are clickable; the last item is the current level. */
export default function Breadcrumbs({
  items,
  className,
}: {
  items: Array<{ label: string; onClick?: () => void }>;
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 && <Icon name="arrow" className="h-3 w-3 text-ink-muted" />}
              {last ? (
                <span className="font-medium text-ink" aria-current="page">
                  {item.label}
                </span>
              ) : item.onClick ? (
                <button
                  onClick={item.onClick}
                  className="text-ink-soft transition-colors hover:text-ink hover:underline"
                >
                  {item.label}
                </button>
              ) : (
                <span className="text-ink-soft">{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}