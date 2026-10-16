import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/webp', 'image/avif'],
    domains: [],
  },
  // Ensure Page Router is used
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  async redirects() {
    return [
      { source: '/godeye', destination: '/transparency', permanent: false },
      { source: '/godeye/:address', destination: '/transparency/:address', permanent: false },
    ];
  },
};

export default nextConfig;