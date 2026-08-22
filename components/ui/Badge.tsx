import { clsx } from "@/lib/cx";

type BadgeVariant = "success" | "warning" | "destructive" | "secondary";

const variantStyles: Record<BadgeVariant, string> = {
  success: "bg-green-50 text-green-700 border-green-200",
  warning: "bg-warn-50 text-warn border-warn-200",
  destructive: "bg-destructive-50 text-destructive border-destructive-200",
  secondary: "bg-slate-50 text-slate-600 border-slate-200",
};

const classes = (variant: BadgeVariant, interactive: boolean) =>
  clsx(
    "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium shadow-card",
    variantStyles[variant],
    interactive && "cursor-pointer hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
  );

export default function Badge({
  className,
  children,
  variant = "secondary",
  onClick = undefined,
}: {
  className?: string;
  children: React.ReactNode;
  variant?: BadgeVariant;
  onClick?: () => void;
}) {
  if (typeof onClick === "function") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={clsx(classes(variant, true), className)}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
        {children}
      </button>
    );
  }
  return (
    <span className={clsx(classes(variant, false), className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
      {children}
    </span>
  );
}