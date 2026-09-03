import type { Metadata } from "next";
import ExploreClient from "./ExploreClient";
import RequireAccess from "@/components/dashboard/RequireAccess";

export const metadata: Metadata = { title: "Explore · InsightFlow" };

export default function ExplorePage() {
  return (
    <RequireAccess permission="sales:view" label="Explore">
      <ExploreClient />
    </RequireAccess>
  );
}