import type { Metadata } from "next";
import PermissionsClient from "./PermissionsClient";
import RequireAccess from "@/components/dashboard/RequireAccess";

export const metadata: Metadata = { title: "Roles & Permissions · Insightful" };

export default function PermissionsPage() {
  return (
    <RequireAccess permission="users:manage" minRole="admin" label="Roles & Permissions">
      <PermissionsClient />
    </RequireAccess>
  );
}
