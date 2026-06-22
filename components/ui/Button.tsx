import { clsx } from "@/lib/cx";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 active:scale-[0.98] whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-white shadow-lift hover:bg-primary-600 hover:-translate-y-0.5",
  secondary:
    "bg-white text-ink border border-border hover:border-ink-muted hover:-translate-y-0.5 shadow-card",
  ghost: "text-ink-soft hover:text-ink hover:bg-bg-soft",
};

const sizes: Record<Size, string> = {
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-7 text-base",
};

export default function Button({
  href = "#",
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href?: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={clsx(base, variants[variant], sizes[size], className)}
    >
      {children}
    </a>
  );
}
