import type { Metadata } from "next";
import OverviewClient from "./OverviewClient";

export const metadata: Metadata = { title: "Overview · Insightful" };

export default function OverviewPage() {
  return <OverviewClient />;
}
