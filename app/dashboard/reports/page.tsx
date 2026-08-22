import type { Metadata } from "next";
import ReportsClient from "./ReportsClient";
import RequireAccess from "@/components/dashboard/RequireAccess";

export const metadata: Metadata = { title: "Reports · Insightful" };

export default function ReportsPage() {
  return (
    <RequireAccess permission="reports:view" label="Reports">
      <ReportsClient />
    </RequireAccess>
  );
}
