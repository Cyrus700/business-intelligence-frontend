import type { Metadata } from "next";
import RecommendationsClient from "./RecommendationsClient";

export const metadata: Metadata = { title: "Recommendations · Insightful" };

export default function RecommendationsPage() {
  return <RecommendationsClient />;
}
