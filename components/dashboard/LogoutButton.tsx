"use client";

import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/auth";
import Icon from "@/components/ui/Icon";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => {
        clearSession();
        router.push("/login");
      }}
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-warn/30 bg-warn-50 px-4 text-sm font-medium text-warn hover:bg-warn/10"
    >
      <Icon name="logout" className="h-4 w-4" /> Log out
    </button>
  );
}
