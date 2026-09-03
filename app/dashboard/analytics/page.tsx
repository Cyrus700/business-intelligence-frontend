import type { Metadata } from "next";
import AnalyticsClient from "./AnalyticsClient";
import RequireAccess from "@/components/dashboard/RequireAccess";

export const metadata: Metadata = { title: "Analytics · InsightFlow" };

export default function AnalyticsPage() {
  return (
    <RequireAccess permission="timeseries:view" label="Analytics">
      <AnalyticsClient />
    </RequireAccess>
  );
}
