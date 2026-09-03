import type { Metadata } from "next";
import AIClient from "./AIClient";
import RequireAccess from "@/components/dashboard/RequireAccess";

export const metadata: Metadata = { title: "AI Assistant · InsightFlow" };

export default function AIPage() {
  return (
    <RequireAccess permission="insights:view" label="AI Assistant">
      <AIClient />
    </RequireAccess>
  );
}
