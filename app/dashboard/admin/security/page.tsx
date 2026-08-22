import type { Metadata } from "next";
import SecurityClient from "./SecurityClient";
import RequireAccess from "@/components/dashboard/RequireAccess";

export const metadata: Metadata = { title: "Security · Admin" };

export default function SecurityPage() {
  return (
    <RequireAccess permission="users:manage" label="Security">
      <SecurityClient />
    </RequireAccess>
  );
}