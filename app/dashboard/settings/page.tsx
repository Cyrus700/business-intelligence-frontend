import type { Metadata } from "next";
import SettingsClient from "./SettingsClient";
import RequireAccess from "@/components/dashboard/RequireAccess";

export const metadata: Metadata = { title: "Settings · InsightFlow" };

export default function SettingsPage() {
  return (
    <RequireAccess permission="dashboard:view" label="Settings">
      <SettingsClient />
    </RequireAccess>
  );
}
