import type { Metadata } from "next";
import RecommendationsClient from "./RecommendationsClient";
import RequireAccess from "@/components/dashboard/RequireAccess";

export const metadata: Metadata = { title: "Recommendations · Insightful" };

export default function RecommendationsPage() {
  return (
    <RequireAccess permission="insights:view" label="Recommendations">
      <RecommendationsClient />
    </RequireAccess>
  );
}
