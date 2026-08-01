import { CacheExpiration } from "serwist";
import type { SerwistPlugin } from "serwist";

const THIRTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 30;

const cacheExpiration = new CacheExpiration("navestory-api-data", {
  maxAgeSeconds: THIRTY_DAYS_IN_SECONDS,
  maxEntries: 200,
});

/**
 * Implementa apenas `cacheDidUpdate` (roda depois de uma escrita de cache bem-sucedida —
 * ou seja, só quando há rede), nunca `cachedResponseWillBeUsed`. O `ExpirationPlugin` padrão
 * do Serwist usa esse segundo hook para recusar servir uma entrada "velha" mesmo servindo
 * puramente do cache, o que forçaria estado vazio offline — violaria RF-10/D9 (o TTL de 30
 * dias é só teto de retenção em disco, nunca prazo de exibição). Aqui a expiração só limpa o
 * disco quando o app conseguiu falar com a rede, nunca bloqueia uma leitura offline.
 *
 * @spec SPEC-20260712-001 RF-10, RNF-06, R-PWA-06
 */
export const apiCacheRetentionPlugin: SerwistPlugin = {
  async cacheDidUpdate({ request }) {
    await cacheExpiration.updateTimestamp(request.url);
    await cacheExpiration.expireEntries();
  },
};
