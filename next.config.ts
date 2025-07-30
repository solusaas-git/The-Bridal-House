import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Development
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/api/uploads/**',
      },
      // Production - Vercel will handle this automatically
      {
        protocol: 'https',
        hostname: '*.vercel.app', // Vercel subdomain
        pathname: '/api/uploads/**',
      },
      // Custom domain (if you have one)
      {
        protocol: 'https',
        hostname: 'app.thebridalhouse.ma',
        pathname: '/api/uploads/**',
      },
    ],
  },
};

export default nextConfig;
