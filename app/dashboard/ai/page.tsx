import type { Metadata } from "next";
import AIClient from "./AIClient";

export const metadata: Metadata = { title: "AI Assistant · Insightful" };

export default function AIPage() {
  return <AIClient />;
}
