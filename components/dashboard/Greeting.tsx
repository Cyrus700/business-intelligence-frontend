"use client";

import { useSession } from "@/lib/auth";
import { useRole } from "@/lib/use-role";
import { ROLE_DESCRIPTIONS } from "@/lib/permissions";

export default function Greeting() {
  const session = useSession();
  const role = useRole();
  const first = session?.name?.split(" ")[0];
  const roleInfo = role ? ROLE_DESCRIPTIONS[role] : null;

  return (
    <>
      Welcome back{first ? `, ${first}` : ""} — here&apos;s your snapshot.
      {roleInfo && (
        <span className="ml-2 text-xs text-ink-muted">
          ({roleInfo.title})
        </span>
      )}
    </>
  );
}
