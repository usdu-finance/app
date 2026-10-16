import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/webp', 'image/avif'],
    domains: [],
  },
  // Ensure Page Router is used
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
};

export default nextConfig;