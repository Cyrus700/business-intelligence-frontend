"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "@/lib/cx";
import { useAuth } from "@/lib/auth-context";
import { useRole, useDashboardBase } from "@/lib/use-role";
import { getRoleInfo, type Role } from "@/lib/permissions";
import Icon from "@/components/ui/Icon";

const ROLE_BADGE: Record<Role, string> = {
  analyst: "bg-green-100 text-green-700",
  manager: "bg-blue-100 text-blue-700",
  admin: "bg-purple-100 text-purple-700",
};

export default function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const role = useRole();
  const base = useDashboardBase();
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const name = user?.full_name ?? "User";
  const email = user?.email ?? "";
  const initial = name?.charAt(0)?.toUpperCase() ?? "U";
  const roleInfo = getRoleInfo(role);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-white/80 px-4 backdrop-blur-xl sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open menu"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border bg-white text-ink-soft transition-colors hover:border-primary/30 hover:text-primary lg:hidden"
      >
        <Icon name="menu" className="h-5 w-5" />
      </button>

      <div className="relative hidden max-w-md flex-1 sm:block">
        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        <input
          type="search"
          placeholder="Search metrics, reports, customers…"
          aria-label="Search"
          className="h-10 w-full rounded-xl border border-border bg-bg-soft pl-9 pr-16 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-border bg-white px-1.5 py-0.5 text-[10px] font-medium text-ink-muted md:block">
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {role && (
          <span
            className={clsx(
              "hidden items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize md:inline-flex",
              ROLE_BADGE[role],
            )}
          >
            {roleInfo?.title ?? role}
          </span>
        )}

        <button
          type="button"
          aria-label="Notifications"
          className="relative grid h-10 w-10 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-bg-soft hover:text-ink"
        >
          <Icon name="bell" className="h-5 w-5" />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-warn ring-2 ring-white" />
        </button>

        <div ref={ref} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex items-center gap-2 rounded-xl py-1.5 pl-1.5 pr-2.5 transition-colors hover:bg-bg-soft"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-sm font-semibold text-white ring-2 ring-white">
              {initial}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block max-w-32 truncate text-sm font-medium leading-tight text-ink">
                {name}
              </span>
              <span className="block max-w-32 truncate text-xs leading-tight text-ink-muted">
                {email}
              </span>
            </span>
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-60 origin-top-right rounded-xl border border-border bg-white p-1.5 shadow-lift"
            >
            <div className="px-3 py-2">
              <p className="truncate text-sm font-medium text-ink">{name}</p>
              <p className="truncate text-xs text-ink-muted">{email}</p>
              {role && (
                <span
                  className={clsx(
                    "mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                    ROLE_BADGE[role],
                  )}
                >
                  {roleInfo?.title ?? role}
                </span>
              )}
            </div>
            <div className="my-1 h-px bg-border" />
            <button
              role="menuitem"
              onClick={() => { router.push(`${base}/settings`); setMenuOpen(false); }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-soft transition-colors hover:bg-bg-soft hover:text-ink"
            >
              <Icon name="gear" className="h-4 w-4" /> Settings
            </button>
            {role === "admin" && (
              <button
                role="menuitem"
                onClick={() => { router.push(`${base}/users`); setMenuOpen(false); }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-soft transition-colors hover:bg-bg-soft hover:text-ink"
              >
                <Icon name="users" className="h-4 w-4" /> Manage users
              </button>
            )}
            <div className="my-1 h-px bg-border" />
            <button
              role="menuitem"
              onClick={logout}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-warn transition-colors hover:bg-warn-50"
            >
              <Icon name="logout" className="h-4 w-4" /> Log out
            </button>
          </div>
        )}
        </div>
      </div>
    </header>
  );
}