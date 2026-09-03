import type { Metadata } from "next";
import SystemHealthClient from "./SystemHealthClient";
import RequireAccess from "@/components/dashboard/RequireAccess";

export const metadata: Metadata = { title: "System Health · InsightFlow" };

export default function SystemHealthPage() {
  return (
    <RequireAccess permission="health:system" label="System Health">
      <SystemHealthClient />
    </RequireAccess>
  );
}