"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import SignupForm from "./SignupForm";
import RegisterBusinessForm from "./RegisterBusinessForm";

type Tab = "personal" | "business";

function TabsInner({
  defaultTab = "personal",
  next = "",
  inviteToken = "",
}: {
  defaultTab?: Tab;
  next?: string;
  inviteToken?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabParam = (searchParams.get("tab")?.toLowerCase() as Tab | null) ?? null;
  const validTab = tabParam === "personal" || tabParam === "business" ? tabParam : null;

  // Personal is the default: a single user needs no invite and no business —
  // signing up gives them their own workspace. Invite links force this tab too,
  // since the token joins an existing team.
  const initial: Tab = inviteToken ? "personal" : (validTab ?? defaultTab);
  const [active, setActive] = useState<Tab>(initial);

  // Sync if inviteToken appears or ?tab= changes externally (back/forward, direct link)
  useEffect(() => {
    if (inviteToken) {
      if (active !== "personal") setActive("personal");
      return;
    }
    if (validTab && validTab !== active) setActive(validTab);
  }, [inviteToken, validTab, active]);

  function switchTab(nextTab: Tab) {
    if (nextTab === active) return;
    setActive(nextTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextTab);
    // keep invite/next etc.
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex rounded-full bg-bg-soft p-1 ring-1 ring-border">
        <button
          type="button"
          aria-pressed={active === "personal"}
          onClick={() => switchTab("personal")}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
            active === "personal" ? "bg-white text-ink shadow-sm ring-1 ring-border" : "text-ink-soft hover:text-ink"
          }`}
        >
          Personal
        </button>
        <button
          type="button"
          aria-pressed={active === "business"}
          onClick={() => switchTab("business")}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
            active === "business" ? "bg-ink text-white shadow-sm" : "text-ink-soft hover:text-ink"
          }`}
        >
          Business
        </button>
      </div>

      <div>{active === "personal" ? <SignupForm next={next} inviteToken={inviteToken} /> : <RegisterBusinessForm />}</div>
    </div>
  );
}

export default function RegisterTabs(props: { defaultTab?: Tab; next?: string; inviteToken?: string }) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <div className="flex rounded-full bg-bg-soft p-1 ring-1 ring-border">
            <div className="flex-1 rounded-full bg-white px-4 py-2 text-sm font-medium text-ink shadow-sm ring-1 ring-border text-center">Personal</div>
            <div className="flex-1 rounded-full px-4 py-2 text-sm font-medium text-ink-soft text-center">Business</div>
          </div>
          <div className="h-64 animate-pulse rounded-2xl bg-bg-soft" />
        </div>
      }
    >
      <TabsInner {...props} />
    </Suspense>
  );
}
