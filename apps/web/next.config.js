/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@cryptoai/core'],
  images: {
    domains: ['cryptoai-documents.s3.me-south-1.amazonaws.com'],
  },
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
};

module.exports = nextConfig;
