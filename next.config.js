/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true
  },
  trailingSlash: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Não tente importar módulos Node.js no lado do cliente
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        dns: false,
        'pg-native': false
      }
    }
    return config
  }
}

module.exports = nextConfig
