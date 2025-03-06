/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true
  },
  trailingSlash: false, // Alterado para false para evitar redirecionamentos 308
  basePath: '',
  assetPrefix: '',
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
  },
  // Configuração para permitir CORS
  async headers() {
    return [
      {
        // Aplicar a todas as rotas
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ]
  }
}

module.exports = nextConfig
