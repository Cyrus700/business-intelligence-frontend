"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "@/lib/cx";
import { BRAND } from "@/lib/content";
import { DASH_NAV } from "@/lib/dashboard-nav";
import { useCan, hasMinRole } from "@/lib/use-role";
import { useAuth } from "@/lib/auth-context";
import { dashboardPath } from "@/lib/permissions";
import Icon from "@/components/ui/Icon";
import BrandLogo from "@/components/ui/BrandLogo";

type IconName = Parameters<typeof Icon>[0]["name"];

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  // DASH_NAV hrefs are written against the underlying page tree
  // ("/dashboard/analytics"); resolve them to this account's role-prefixed
  // URL ("/admin/dashboard/analytics") so links, active-state and the URL
  // bar all agree with proxy.ts's routing.
  const base = dashboardPath(user?.role);
  const href = (navHref: string) => dashboardPath(user?.role, navHref.replace(/^\/dashboard/, ""));
  const can = {
    "dashboard:view": useCan("dashboard:view"),
    "insights:view": useCan("insights:view"),
    "timeseries:view": useCan("timeseries:view"),
    "reports:view": useCan("reports:view"),
    "anomalies:view": useCan("anomalies:view"),
    "uploads:create": useCan("uploads:create"),
    "users:manage": useCan("users:manage"),
  } as const;

  const isSuper = !!user?.is_super_admin;
  const visible = DASH_NAV.filter(
    (item) =>
      (item.permission ? can[item.permission as keyof typeof can] : true) &&
      (!item.minRole || hasMinRole(user?.role ?? null, item.minRole)) &&
      (!(item as any).superAdminOnly || isSuper),
  );

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-white">
      <div className="flex h-16 shrink-0 items-center px-6">
        <Link
          href={base}
          onClick={onNavigate}
          aria-label={`${BRAND.name} dashboard`}
          className="flex items-center"
        >
          <BrandLogo height={36} priority />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {visible.map((item) => {
          const resolvedHref = href(item.href);
          const active =
            item.href === "/dashboard" ? pathname === base : pathname.startsWith(resolvedHref);
          return (
            <Link
              key={item.href}
              href={resolvedHref}
              onClick={onNavigate}
              // The whole nav sits in the viewport at once, so the default
              // viewport-prefetch fires an RSC request for every dashboard
              // route the moment the shell paints — a dozen payloads competing
              // with the data the user actually asked for. `false` keeps
              // hover-prefetch, which warms the route just as effectively.
              prefetch={false}
              className={clsx(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary-50 font-semibold text-primary"
                  : "text-ink-soft hover:bg-bg-soft hover:text-ink",
              )}
            >
              <Icon
                name={item.icon as IconName}
                className={clsx(
                  "h-5 w-5 transition-transform duration-200",
                  !active && "group-hover:translate-x-0.5",
                )}
              />
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

      <div className="m-3 rounded-2xl bg-gradient-to-br from-primary to-[#8b5cf6] p-4 text-white shadow-lift">
        <p className="text-sm font-semibold">Upgrade to Growth</p>
        <p className="mt-1 text-xs text-white/80">
          Unlock unlimited sources, forecasting & alerts.
        </p>
        <Link
          href={href("/dashboard/settings")}
          onClick={onNavigate}
          className="mt-3 inline-flex h-8 items-center rounded-lg bg-white px-3 text-xs font-medium text-primary transition-transform hover:-translate-y-0.5"
        >
          See plans
        </Link>
      </div>

      <div className="shrink-0 border-t border-border px-6 py-4">
        <p className="truncate text-xs font-medium text-ink">
          {user?.full_name ?? user?.email ?? "Account"}
        </p>
        <p className="truncate text-[11px] text-ink-muted">
          {user?.email} ·{" "}
          {user?.role ? `${user.role[0].toUpperCase()}${user.role.slice(1)}` : "Analyst"}
        </p>
      </div>
    </div>
  );
}