import { clsx } from "@/lib/cx";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 active:scale-[0.98] whitespace-nowrap select-none touch-manipulation";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-white shadow-card lg:shadow-lift lg:hover:bg-primary-600 lg:hover:-translate-y-0.5",
  secondary:
    "bg-white text-ink border border-border lg:hover:border-ink-muted lg:hover:-translate-y-0.5 shadow-card",
  ghost: "text-ink-soft hover:text-ink hover:bg-bg-soft",
  outline: "bg-white text-ink border border-border hover:border-ink-muted shadow-card",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-xs min-h-[36px]",
  md: "h-10 px-5 text-sm min-h-[40px]",
  lg: "h-11 sm:h-12 px-6 sm:px-7 text-[15px] sm:text-base min-h-[44px]",
};

export default function Button({
  href = "#",
  variant = "primary",
  size = "md",
  className,
  children,
  onClick,
  ariaLabel,
}: {
  href?: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  return (
    <a
      href={href}
      aria-label={ariaLabel}
      onClick={onClick}
      className={clsx(base, variants[variant], sizes[size], className)}
    >
      {children}
    </a>
  );
}