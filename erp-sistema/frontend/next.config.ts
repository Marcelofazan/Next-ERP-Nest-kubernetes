import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Desative temporariamente o Turbopack no build de produção do container se o erro persistir,
  // pois ele injeta variáveis agressivamente em tempo de compilação.
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        // CORREÇÃO DEFINITIVA: Aponta direto para o nome do serviço do Docker.
        // O container do Next sempre consegue resolver o nome "backend" na rede do Docker.
        destination: 'http://backend:3002/api/:path*',
      },
    ];
  },
};

export default nextConfig;