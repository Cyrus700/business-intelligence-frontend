import type { Metadata } from "next";
import DataClient from "./DataClient";

export const metadata: Metadata = { title: "Data Integration · Insightful" };

export default function DataPage() {
  return <DataClient />;
}
