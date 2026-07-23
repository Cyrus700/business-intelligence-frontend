"use client";

import { useRole } from "@/lib/use-role";
import type { Role } from "@/lib/permissions";

export default function RoleAnalytics({
  children,
}: {
  children: (role: Role) => React.ReactNode;
}) {
  const role = useRole();
  return <>{role ? children(role) : null}</>;
}
