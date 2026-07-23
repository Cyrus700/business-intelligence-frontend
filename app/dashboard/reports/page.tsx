import type { Metadata } from "next";
import ReportsClient from "./ReportsClient";

export const metadata: Metadata = { title: "Reports · Insightful" };

export default function ReportsPage() {
  return <ReportsClient />;
}
