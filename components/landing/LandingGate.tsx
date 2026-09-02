"use client";

// LandingGate is now a pass-through — the landing renders instantly and
// live data populates progressively via skeletons. No full-screen loader
// that blocks the first paint.

export default function LandingGate({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}