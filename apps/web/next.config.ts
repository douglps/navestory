import type { NextConfig } from "next";

/**
 * Rewrite de `/api/backend/*` para o NestJS local — faz o browser enxergar tudo como
 * mesma origem (localhost:3000), evitando o problema de cookie httpOnly cross-origin
 * entre web (3000) e api (3001). Ver ADR-003, addendum "Mecanismo de sessão cross-origin".
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const apiInternalUrl = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
    return [
      {
        source: "/api/backend/:path*",
        destination: `${apiInternalUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
