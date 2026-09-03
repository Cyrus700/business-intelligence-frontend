import type { Metadata } from "next";
import OverviewClient from "./OverviewClient";
import RequireAccess from "@/components/dashboard/RequireAccess";

export const metadata: Metadata = { title: "Overview · InsightFlow" };

export default function OverviewPage() {
  return (
    <RequireAccess permission="dashboard:view" label="Overview">
      <OverviewClient />
    </RequireAccess>
  );
}
