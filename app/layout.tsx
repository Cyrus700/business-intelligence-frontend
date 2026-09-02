import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import GsapProvider from "@/components/providers/GsapProvider";
import QueryProvider from "@/components/providers/QueryProvider";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/components/ui/Toast";
import { BRAND } from "@/lib/content";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.tagline}`,
  description:
    "Unify every spreadsheet, database and API into one cloud dashboard. AI forecasts trends, flags anomalies and recommends your next move — built for SMEs.",
  keywords: [
    "business intelligence",
    "AI analytics",
    "cloud BI",
    "predictive analytics",
    "anomaly detection",
    "decision support dashboard",
  ],
  openGraph: {
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description:
      "Turn scattered data into real-time decisions with AI-driven cloud business intelligence.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add('js');`,
          }}
        />
        {/* If JS is disabled, scroll-reveal elements must still be visible. */}
        <noscript>
          <style>{`[data-reveal]{opacity:1 !important;transform:none !important;}`}</style>
        </noscript>
      </head>
      <body className="min-h-full flex flex-col bg-bg text-ink">
        <QueryProvider><GsapProvider><AuthProvider><ToastProvider>{children}</ToastProvider></AuthProvider></GsapProvider></QueryProvider>
      </body>
    </html>
  );
}
