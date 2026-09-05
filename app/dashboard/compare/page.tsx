import RequireAccess from "@/components/dashboard/RequireAccess";
import CompareClient from "./CompareClient";

export default function ComparePage() {
  return (
    <RequireAccess permission="compare:view" label="Compare">
      <CompareClient />
    </RequireAccess>
  );
}
