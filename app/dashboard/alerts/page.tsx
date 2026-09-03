import type { Metadata } from "next";
import AlertsClient from "./AlertsClient";
import RequireAccess from "@/components/dashboard/RequireAccess";

export const metadata: Metadata = { title: "Alerts · InsightFlow" };

export default function AlertsPage() {
  return (
    <RequireAccess permission="anomalies:view" label="Alerts">
      <AlertsClient />
    </RequireAccess>
  );
}
