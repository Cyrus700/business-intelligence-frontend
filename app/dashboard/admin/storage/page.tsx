import type { Metadata } from "next";
import StorageClient from "./StorageClient";
import RequireAccess from "@/components/dashboard/RequireAccess";

export const metadata: Metadata = { title: "Storage · Admin" };

export default function StoragePage() {
  return (
    <RequireAccess permission="users:manage" label="Storage">
      <StorageClient />
    </RequireAccess>
  );
}