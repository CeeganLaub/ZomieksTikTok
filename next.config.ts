import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Cloudflare Workers deployment
  experimental: {
    // Enable edge runtime by default for API routes
  },
  images: {
    // Use Cloudflare Image optimization or unoptimized for now
    unoptimized: true,
  },
};

export default nextConfig;
