import type { NextConfig } from "next";

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

export default nextConfig;
