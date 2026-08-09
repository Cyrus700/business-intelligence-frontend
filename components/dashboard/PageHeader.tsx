export default function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 max-w-xl text-sm text-ink-soft">{subtitle}</p>
        )}
      </div>
      {action && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {action}
        </div>
      )}
    </div>
  );
}