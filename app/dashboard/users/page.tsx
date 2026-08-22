import type { Metadata } from "next";
import UsersClient from "./UsersClient";
import RequireAccess from "@/components/dashboard/RequireAccess";

export const metadata: Metadata = { title: "Users · Insightful" };

export default function UsersPage() {
  return (
    <RequireAccess permission="users:manage" minRole="admin" label="Users">
      <UsersClient />
    </RequireAccess>
  );
}
