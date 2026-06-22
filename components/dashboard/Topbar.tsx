"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "@/lib/cx";
import { useSession, clearSession } from "@/lib/auth";
import Icon from "@/components/ui/Icon";

export default function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();
  const session = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function logout() {
    clearSession();
    router.push("/login");
  }

  const initial = session?.name?.charAt(0)?.toUpperCase() ?? "U";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-white/80 px-4 backdrop-blur-xl sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open menu"
        className="grid h-10 w-10 place-items-center rounded-lg border border-border text-ink-soft lg:hidden"
      >
        <Icon name="menu" className="h-5 w-5" />
      </button>

      {/* Search */}
      <div className="relative hidden max-w-md flex-1 sm:block">
        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        <input
          type="search"
          placeholder="Search metrics, reports, customers…"
          className="h-10 w-full rounded-xl border border-border bg-bg-soft pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          aria-label="Notifications"
          className="relative grid h-10 w-10 place-items-center rounded-lg text-ink-soft hover:bg-bg-soft"
        >
          <Icon name="bell" className="h-5 w-5" />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-warn ring-2 ring-white" />
        </button>

        <div ref={ref} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-xl py-1.5 pl-1.5 pr-2.5 hover:bg-bg-soft"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-sm font-semibold text-white">
              {initial}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-medium leading-tight text-ink">
                {session?.name ?? "User"}
              </span>
              <span className="block text-xs leading-tight text-ink-muted">
                {session?.email ?? ""}
              </span>
            </span>
          </button>

          <div
            className={clsx(
              "absolute right-0 mt-2 w-52 origin-top-right rounded-xl border border-border bg-white p-1.5 shadow-lift transition-all",
              menuOpen ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0",
            )}
          >
            <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-bg-soft">
              <Icon name="user" className="h-4 w-4" /> Profile
            </button>
            <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-bg-soft">
              <Icon name="gear" className="h-4 w-4" /> Settings
            </button>
            <div className="my-1 h-px bg-border" />
            <button
              onClick={logout}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-warn hover:bg-warn-50"
            >
              <Icon name="logout" className="h-4 w-4" /> Log out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
