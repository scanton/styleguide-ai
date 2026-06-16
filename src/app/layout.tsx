import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import Script from "next/script";
import { PendingShareHandler } from "@/components/rising/PendingShareHandler";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://styleguideai.com"),
  title: {
    default: "StyleGuideAI — AI Art Community & Tools",
    template: "%s | StyleGuideAI",
  },
  description:
    "StyleGuideAI is a 1,000+ member AI art community. Explore our AI art prompt generators, Virtual Museum of art history, and consulting services.",
  keywords: ["AI art", "art history", "StyleBear", "prompt generator", "Virtual Museum"],
  openGraph: {
    siteName: "StyleGuideAI",
    type: "website",
    images: [
      {
        url: "/images/og/og-default.png",
        width: 1672,
        height: 941,
        alt: "StyleGuideAI — AI Art Community & Tools",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/images/og/og-default.png"],
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:font-medium focus:shadow-lg"
        >
          Skip to main content
        </a>
        <SessionProvider>
          <PendingShareHandler />
          {children}
        </SessionProvider>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-3317TYL03E"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-3317TYL03E');
          `}
        </Script>
      </body>
    </html>
  );
}
