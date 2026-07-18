import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

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

// @spec SPEC-20260716-002 RF-06, CA-09
// Envia source maps ao Sentry no build quando SENTRY_AUTH_TOKEN está presente (CI apenas);
// ausência do token não quebra o build — o upload é pulado silenciosamente.
// `deleteSourcemapsAfterUpload` (default true) evita que os .map fiquem acessíveis
// publicamente após o deploy.
export default withSentryConfig(nextConfig, {
  silent: true,
  authToken: process.env.SENTRY_AUTH_TOKEN,
});
