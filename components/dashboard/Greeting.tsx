"use client";

import { useSession } from "@/lib/auth";

export default function Greeting() {
  const session = useSession();
  const first = session?.name?.split(" ")[0];
  return <>Welcome back{first ? `, ${first}` : ""} — here&apos;s your snapshot.</>;
}
