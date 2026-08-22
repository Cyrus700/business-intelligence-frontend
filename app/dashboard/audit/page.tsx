import type { Metadata } from "next";
import AuditClient from "./AuditClient";
import RequireAccess from "@/components/dashboard/RequireAccess";

export const metadata: Metadata = { title: "Audit Logs · Insightful" };

export default function AuditPage() {
  return (
    <RequireAccess permission="audit-logs:view" label="Audit Logs">
      <AuditClient />
    </RequireAccess>
  );
}