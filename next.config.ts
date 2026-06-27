import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    qualities: [70, 75, 85],
    remotePatterns: [
      // DeviantArt CDN (WixMP)
      { protocol: "https", hostname: "**.wixmp.com" },
      // Wikimedia Commons (museum artworks)
      { protocol: "https", hostname: "upload.wikimedia.org" },
      // Google profile images (OAuth avatars)
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // Vercel Blob (community StyleTarot card images)
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default withNextIntl(nextConfig);
