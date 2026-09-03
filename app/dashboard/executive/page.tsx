import type { Metadata } from "next";
import ExecutiveClient from "./ExecutiveClient";
import RequireAccess from "@/components/dashboard/RequireAccess";

export const metadata: Metadata = { title: "Executive Dashboard · InsightFlow" };

export default function ExecutivePage() {
  return (
    <RequireAccess permission="dashboard:view" label="Executive Dashboard">
      <ExecutiveClient />
    </RequireAccess>
  );
}