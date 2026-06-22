import Link from "next/link";
import { BRAND } from "@/lib/content";
import Icon from "@/components/ui/Icon";
import AuthBrandPanel from "./AuthBrandPanel";

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      {/* Form side */}
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/" className="flex w-fit items-center gap-2 font-semibold text-ink">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-white shadow-lift">
            <Icon name="chart" className="h-4 w-4" />
          </span>
          {BRAND.name}
        </Link>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">
            <h1 className="text-3xl font-semibold tracking-tight text-ink">{title}</h1>
            <p className="mt-2 text-sm text-ink-soft">{subtitle}</p>
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-8 text-center text-sm text-ink-soft">{footer}</div>}
          </div>
        </div>

        <p className="text-center text-xs text-ink-muted lg:text-left">
          © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
        </p>
      </div>

      {/* Brand side */}
      <AuthBrandPanel />
    </div>
  );
}
