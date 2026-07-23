import type { Metadata } from "next";
import PermissionsClient from "./PermissionsClient";

export const metadata: Metadata = { title: "Roles & Permissions · Insightful" };

export default function PermissionsPage() {
  return <PermissionsClient />;
}
