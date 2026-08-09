"use client";

export default function Pagination({
  page,
  pages,
  total,
  totalLabel = "items",
  onChange,
}: {
  page: number;
  pages: number;
  total: number;
  totalLabel?: string;
  onChange: (p: number) => void;
}) {
  if (pages <= 1) return null;

  return (
    <div className="flex flex-col items-start justify-between gap-3 text-sm text-ink-soft sm:flex-row sm:items-center">
      <span>
        Page {page} of {pages} · {total.toLocaleString()} {totalLabel}
      </span>
      <div className="flex flex-wrap gap-1.5">
        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-bg-soft disabled:opacity-40 disabled:pointer-events-none"
        >
          Prev
        </button>
        {pages <= 7
          ? Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => onChange(p)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                  p === page
                    ? "border-primary bg-primary text-white"
                    : "border-border hover:bg-bg-soft"
                }`}
              >
                {p}
              </button>
            ))
          : (() => {
              const start = Math.max(1, page - 2);
              const end = Math.min(pages, page + 2);
              const items: React.ReactNode[] = [];
              if (start > 1) {
                items.push(
                  <button
                    key={1}
                    onClick={() => onChange(1)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-bg-soft"
                  >
                    1
                  </button>,
                );
                if (start > 2) items.push(<span key="se1" className="px-1">···</span>);
              }
              for (let i = start; i <= end; i++) {
                items.push(
                  <button
                    key={i}
                    onClick={() => onChange(i)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                      i === page
                        ? "border-primary bg-primary text-white"
                        : "border-border hover:bg-bg-soft"
                    }`}
                  >
                    {i}
                  </button>,
                );
              }
              if (end < pages) {
                if (end < pages - 1) items.push(<span key="se2" className="px-1">···</span>);
                items.push(
                  <button
                    key={pages}
                    onClick={() => onChange(pages)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-bg-soft"
                  >
                    {pages}
                  </button>,
                );
              }
              return items;
            })()}
        <button
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-bg-soft disabled:opacity-40 disabled:pointer-events-none"
        >
          Next
        </button>
      </div>
    </div>
  );
}
