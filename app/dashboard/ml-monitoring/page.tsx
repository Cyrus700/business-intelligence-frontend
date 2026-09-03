import type { Metadata } from "next";
import MlMonitoringClient from "./MlMonitoringClient";
import RequireAccess from "@/components/dashboard/RequireAccess";

export const metadata: Metadata = { title: "ML Monitoring · InsightFlow" };

export default function MlMonitoringPage() {
  return (
    <RequireAccess permission="ml:monitor" label="ML Monitoring">
      <MlMonitoringClient />
    </RequireAccess>
  );
}