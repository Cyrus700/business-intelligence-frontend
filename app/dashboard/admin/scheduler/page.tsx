import type { Metadata } from "next";
import SchedulerClient from "./SchedulerClient";
import RequireAccess from "@/components/dashboard/RequireAccess";

export const metadata: Metadata = { title: "Scheduler · Admin" };

export default function SchedulerPage() {
  return (
    <RequireAccess permission="users:manage" label="Scheduler">
      <SchedulerClient />
    </RequireAccess>
  );
}