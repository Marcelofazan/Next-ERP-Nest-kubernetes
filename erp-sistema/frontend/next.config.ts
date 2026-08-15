import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        // Aponta de volta para o nome do serviço na rede interna do Docker Compose
        destination: 'http://backend:3002/api/:path*', //Postgres
        //destination: 'http://localhost:3002/api/:path*', //SQLite
      },
    ];
  },
};

export default nextConfig;
