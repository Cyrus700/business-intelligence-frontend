import type { Metadata } from "next";
import BusinessesClient from "./BusinessesClient";
import RequireAccess from "@/components/dashboard/RequireAccess";

export const metadata: Metadata = { title: "Businesses · InsightFlow" };

export default function BusinessesPage() {
  return (
    <RequireAccess permission="users:manage" minRole="admin" label="Businesses">
      <BusinessesClient />
    </RequireAccess>
  );
}
