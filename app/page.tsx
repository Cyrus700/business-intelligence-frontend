import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/sections/Hero";
import Stats from "@/components/sections/Stats";
import Features from "@/components/sections/Features";
import HowItWorks from "@/components/sections/HowItWorks";
import DashboardPreview from "@/components/sections/DashboardPreview";
import Comparison from "@/components/sections/Comparison";
import Security from "@/components/sections/Security";
import Pricing from "@/components/sections/Pricing";
import Faq from "@/components/sections/Faq";
import CtaNewsletter from "@/components/sections/CtaNewsletter";
import { getPlatformSnapshot, relativeTime } from "@/lib/landing-live";

// The page is prerendered and refreshed on a timer, so visitors get HTML that
// already contains the platform figures. Nothing here fetches metrics from the
// browser any more — that's what made the numbers appear and then change a
// moment after paint. Keep this in step with LIVE_REVALIDATE in lib/landing-live.
export const revalidate = 60;

export default async function Home() {
  const live = await getPlatformSnapshot();
  // Formatted once, on the server, so the client can't recompute it and
  // disagree with the server-rendered HTML.
  const lastRunLabel = live?.pipeline.last_run_at
    ? relativeTime(live.pipeline.last_run_at)
    : null;

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero live={live} lastRunLabel={lastRunLabel} />
        <Stats live={live} lastRunLabel={lastRunLabel} />
        <Features />
        <HowItWorks live={live} />
        <DashboardPreview live={live} lastRunLabel={lastRunLabel} />
        <Comparison />
        <Security />
        <Pricing />
        <Faq />
        <CtaNewsletter live={live} />
      </main>
      <Footer />
    </>
  );
}
