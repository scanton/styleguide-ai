import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display, Noto_Sans, Noto_Sans_SC, Noto_Sans_JP } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import Script from "next/script";
import { PendingShareHandler } from "@/components/rising/PendingShareHandler";
import { routing, type Locale } from "@/i18n/routing";
import { notFound } from "next/navigation";
import "../globals.css";

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

// Cyrillic coverage (Russian)
const notoSans = Noto_Sans({
  variable: "--font-noto",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

// Simplified Chinese — Noto Sans SC includes all CJK glyphs by default
const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto-sc",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "700"],
});

// Japanese — Noto Sans JP includes all Japanese glyphs by default
const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-jp",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.styleguideai.com"),
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

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// CJK/Cyrillic locales that need extra fonts
const CJK_LOCALES: Locale[] = ["zh", "ja"];
const CYRILLIC_LOCALES: Locale[] = ["ru"];

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  const messages = await getMessages();

  const isCJK = CJK_LOCALES.includes(locale as Locale);
  const isCyrillic = CYRILLIC_LOCALES.includes(locale as Locale);

  // Build font variable string — always load base fonts, add CJK/Cyrillic as needed
  const fontVars = [
    geistSans.variable,
    geistMono.variable,
    playfair.variable,
    (isCyrillic || isCJK) ? notoSans.variable : "",
    locale === "zh" ? notoSansSC.variable : "",
    locale === "ja" ? notoSansJP.variable : "",
  ]
    .filter(Boolean)
    .join(" ");

  // Font stack: prefer CJK/Cyrillic fonts for those locales so they render correctly
  const bodyFontStyle =
    locale === "zh"
      ? { fontFamily: "var(--font-noto-sc), var(--font-sans), sans-serif" }
      : locale === "ja"
      ? { fontFamily: "var(--font-noto-jp), var(--font-sans), sans-serif" }
      : locale === "ru"
      ? { fontFamily: "var(--font-noto), var(--font-sans), sans-serif" }
      : undefined;

  return (
    <html
      lang={locale}
      className={`${fontVars} h-full antialiased`}
    >
      <head>
        {routing.locales.map((l) => (
          <link
            key={l}
            rel="alternate"
            hrefLang={l}
            href={`https://www.styleguideai.com/${l}`}
          />
        ))}
        <link rel="alternate" hrefLang="x-default" href="https://www.styleguideai.com/en" />
      </head>
      <body className="min-h-full flex flex-col" style={bodyFontStyle}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:font-medium focus:shadow-lg"
        >
          Skip to main content
        </a>
        <NextIntlClientProvider messages={messages}>
          <SessionProvider>
            <PendingShareHandler />
            {children}
          </SessionProvider>
        </NextIntlClientProvider>
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
