/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 176, 256, 384],
    formats: ['image/webp'],
    domains: ['qtdnxqsgfqelbdhxgtia.supabase.co']
  },
  env: {
    NEXT_PUBLIC_ASAAS_API_KEY: process.env.NEXT_PUBLIC_ASAAS_API_KEY,
    NEXT_PUBLIC_ASAAS_WEBHOOK_TOKEN: process.env.NEXT_PUBLIC_ASAAS_WEBHOOK_TOKEN,
    ASAAS_API_KEY: process.env.ASAAS_API_KEY,
  },
  experimental: {
    serverActions: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/asaas/:path*',
        destination: 'https://sandbox.asaas.com/api/v3/:path*'
      }
    ]
  }
}

module.exports = nextConfig
