import type { Metadata } from "next";
import DataClient from "./DataClient";
import RequireAccess from "@/components/dashboard/RequireAccess";

export const metadata: Metadata = { title: "Data Integration · InsightFlow" };

export default function DataPage() {
  return (
    <RequireAccess permission="uploads:create" label="Data Integration">
      <DataClient />
    </RequireAccess>
  );
}
