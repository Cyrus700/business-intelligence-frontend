import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import LandingGate from "@/components/landing/LandingGate";
import Hero from "@/components/sections/Hero";
import LiveTicker from "@/components/sections/LiveTicker";
import Stats from "@/components/sections/Stats";
import Features from "@/components/sections/Features";
import HowItWorks from "@/components/sections/HowItWorks";
import DashboardPreview from "@/components/sections/DashboardPreview";
import Comparison from "@/components/sections/Comparison";
import Security from "@/components/sections/Security";
import Pricing from "@/components/sections/Pricing";
import Faq from "@/components/sections/Faq";
import CtaNewsletter from "@/components/sections/CtaNewsletter";

export default function Home() {
  return (
    <LandingGate>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <LiveTicker />
        <Stats />
        <Features />
        <HowItWorks />
        <DashboardPreview />
        <Comparison />
        <Security />
        <Pricing />
        <Faq />
        <CtaNewsletter />
      </main>
      <Footer />
    </LandingGate>
  );
}
