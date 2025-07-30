import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // Disable optimization for Vercel Blob compatibility
    remotePatterns: [
      // Development
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3055', // Updated to correct port
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
      // Vercel Blob Storage - for direct blob URLs
      {
        protocol: 'https',
        hostname: '*.vercel-storage.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
