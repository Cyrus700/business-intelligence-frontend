import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/sections/Hero";
import LogoCloud from "@/components/sections/LogoCloud";
import Stats from "@/components/sections/Stats";
import Features from "@/components/sections/Features";
import HowItWorks from "@/components/sections/HowItWorks";
import DashboardPreview from "@/components/sections/DashboardPreview";
import AiEngine from "@/components/sections/AiEngine";
import Integrations from "@/components/sections/Integrations";
import Comparison from "@/components/sections/Comparison";
import Security from "@/components/sections/Security";
import Pricing from "@/components/sections/Pricing";
import Testimonials from "@/components/sections/Testimonials";
import Faq from "@/components/sections/Faq";
import CtaNewsletter from "@/components/sections/CtaNewsletter";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <LogoCloud />
        <Stats />
        <Features />
        <HowItWorks />
        <DashboardPreview />
        <AiEngine />
        <Integrations />
        <Comparison />
        <Security />
        <Pricing />
        <Testimonials />
        <Faq />
        <CtaNewsletter />
      </main>
      <Footer />
    </>
  );
}
