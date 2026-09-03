import type { Metadata } from "next";
import AdminControlCenterClient from "./AdminControlCenterClient";
import RequireAccess from "@/components/dashboard/RequireAccess";

export const metadata: Metadata = { title: "Admin Control Center · InsightFlow" };

export default function AdminControlCenterPage() {
  return (
    <RequireAccess permission="users:manage" label="Admin Control Center">
      <AdminControlCenterClient />
    </RequireAccess>
  );
}