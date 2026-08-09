"use client";

import { useEffect, useState } from "react";
import { useLandingData, useLandingLive } from "@/lib/landing-api";
import LandingLoader from "@/components/ui/LandingLoader";

// Holds the preloader on screen while the landing queries are pending and
// releases the page the moment they settle, so the sections mount fresh and
// run their entrance animations as the loader fades. On error the page is
// released too — sections fall back to static copy and "—" placeholders.

export default function LandingGate({ children }: { children: React.ReactNode }) {
  const { loading: liveLoading, error: liveError } = useLandingLive();
  const { loading: contentLoading, error: contentError } = useLandingData();

  const pending = (liveLoading || contentLoading) && !liveError && !contentError;
  const [leaving, setLeaving] = useState(!pending);
  const [gone, setGone] = useState(!pending);

  useEffect(() => {
    if (pending) return;
    // Fade the loader out before unmounting it. Runs only after the queries
    // settle (and on error release).
    const fadeOut = setTimeout(() => setLeaving(true), 50);
    const unmount = setTimeout(() => setGone(true), 650);
    return () => {
      clearTimeout(fadeOut);
      clearTimeout(unmount);
    };
  }, [pending]);

  return (
    <>
      {!gone && <LandingLoader leaving={leaving} />}
      {!pending && children}
    </>
  );
}