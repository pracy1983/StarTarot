/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configurações padrão para Next.js

  // Excluir módulos nativos do Node.js do bundle do webpack (não são compatíveis com Edge Runtime)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // No client bundle, substituir módulos node-only por módulos vazios
      config.resolve.fallback = {
        ...config.resolve.fallback,
        pg: false,
        'pg-native': false,
        net: false,
        tls: false,
        fs: false,
        dns: false,
        crypto: false,
      };
    }
    return config;
  },

  // Marcar pg como pacote externo para garantir que rode no Node.js runtime
  serverExternalPackages: ['pg', 'pg-native'],
}

module.exports = nextConfig
