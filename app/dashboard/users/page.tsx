import type { Metadata } from "next";
import UsersClient from "./UsersClient";

export const metadata: Metadata = { title: "Users · Insightful" };

export default function UsersPage() {
  return <UsersClient />;
}
