"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "@/lib/cx";
import { BRAND } from "@/lib/content";
import { DASH_NAV } from "@/lib/dashboard-nav";
import Icon from "@/components/ui/Icon";

type IconName = Parameters<typeof Icon>[0]["name"];

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col border-r border-border bg-white">
      <div className="flex h-16 items-center px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-ink">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-white shadow-lift">
            <Icon name="chart" className="h-4 w-4" />
          </span>
          {BRAND.name}
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {DASH_NAV.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={clsx(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary-50 text-primary"
                  : "text-ink-soft hover:bg-bg-soft hover:text-ink",
              )}
            >
              <Icon name={item.icon as IconName} className="h-5 w-5" />
              {item.label}
              {item.badge && (
                <span className="ml-auto rounded-full bg-warn px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-2xl bg-gradient-to-br from-primary to-[#8b5cf6] p-4 text-white">
        <p className="text-sm font-semibold">Upgrade to Growth</p>
        <p className="mt-1 text-xs text-white/80">
          Unlock unlimited sources, forecasting & alerts.
        </p>
        <Link
          href="/dashboard/settings"
          className="mt-3 inline-flex h-8 items-center rounded-lg bg-white px-3 text-xs font-medium text-primary"
        >
          See plans
        </Link>
      </div>
    </div>
  );
}
