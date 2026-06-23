import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      // DeviantArt CDN (WixMP)
      { protocol: "https", hostname: "**.wixmp.com" },
      // Wikimedia Commons (museum artworks)
      { protocol: "https", hostname: "upload.wikimedia.org" },
      // Google profile images (OAuth avatars)
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default withNextIntl(nextConfig);
