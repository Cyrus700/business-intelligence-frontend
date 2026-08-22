import RequireAccess from "@/components/dashboard/RequireAccess";
import DataQualityClient from "./DataQualityClient";

export default function DataQualityPage() {
  return (
    <RequireAccess permission="quality:view" label="Data Quality">
      <DataQualityClient />
    </RequireAccess>
  );
}