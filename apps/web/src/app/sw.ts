/// <reference lib="webworker" />
import {
  Serwist,
  NetworkFirst,
  StaleWhileRevalidate,
  NetworkOnly,
} from "serwist";
import type { PrecacheEntry } from "serwist";
import { apiCacheRetentionPlugin } from "@/lib/pwa/api-cache-retention-plugin";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[];
};

// @spec SPEC-20260712-001 R-PWA-01
// Estratégias por tipo de recurso (D4): CacheFirst para assets versionados (via precache,
// RF-05), NetworkFirst para navegação com fallback offline (RF-06/RF-07), StaleWhileRevalidate
// para leitura de API (RF-08/RF-10), NetworkOnly para mutações (RF-09, nunca cacheadas).
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // RF-14/RF-15, RNF-07: skipWaiting nunca automático — só via messageSkipWaiting(),
  // disparado pelo toast de atualização quando o usuário confirma o reload (o construtor do
  // Serwist já registra o listener padrão de `{ type: "SKIP_WAITING" }` quando isso é false).
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    {
      // RF-06, RF-07 — navegação de rotas
      matcher: ({ request }) => request.mode === "navigate",
      method: "GET",
      handler: new NetworkFirst({
        cacheName: "navestory-pages",
        networkTimeoutSeconds: 3,
      }),
    },
    {
      // RF-08, RF-10 — leitura de dados da API. Caminho real é `/api/backend/*`
      // (rewrite de mesma origem definido em next.config.ts, não `/api/*` cru).
      matcher: ({ url, request }) =>
        request.method === "GET" && url.pathname.startsWith("/api/backend/"),
      method: "GET",
      // RNF-06/R-PWA-06/RF-10/D9: teto de retenção em disco, nunca prazo de exibição — ver
      // api-cache-retention-plugin.ts (não usa o ExpirationPlugin padrão, que bloquearia a
      // leitura de uma entrada "velha" mesmo offline).
      handler: new StaleWhileRevalidate({
        cacheName: "navestory-api-data",
        plugins: [apiCacheRetentionPlugin],
      }),
    },
    // RF-09 — mutações nunca interceptadas por estratégia de cache, sempre NetworkOnly.
    ...(["POST", "PUT", "PATCH", "DELETE"] as const).map((method) => ({
      matcher: ({ url }: { url: URL }) =>
        url.pathname.startsWith("/api/backend/"),
      method,
      handler: new NetworkOnly(),
    })),
  ],
  // RF-07/EC-01: fallback para /offline apenas quando a navegação falha por completo (rota
  // nunca visitada, sem cache, sem rede) — nunca aplicado a chamadas de API/mutação, pois o
  // matcher abaixo só casa `request.destination === "document"` (Serwist aplica este plugin
  // a toda estratégia internamente, mas o matcher garante que só navegação é afetada).
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
