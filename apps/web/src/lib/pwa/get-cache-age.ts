/**
 * Lê o cabeçalho `Date` da resposta em cache da rota atual (`navestory-pages`) e das entradas de
 * dados de API (`navestory-api-data`), retornando o timestamp mais recente entre elas — a data
 * "mais atual" que o usuário está vendo na tela offline (RF-13/RF-13.1).
 *
 * Escopo: como as chamadas de API não carregam metadado de qual tela as originou, a leitura
 * considera todas as entradas de `navestory-api-data` (não apenas as da tela atual) — na prática,
 * a jornada descrita na spec (visita sequencial dashboard → despesas) faz isso coincidir com
 * os dados relevantes na maioria dos casos; um mapeamento rota→chamadas seria uma
 * complexidade desproporcional ao ganho nesta fase.
 *
 * @spec SPEC-20260712-001 RF-13, RF-13.1
 */
export async function getMostRecentCacheTimestamp(
  pathname: string,
): Promise<Date | null> {
  if (typeof caches === "undefined") return null;

  const timestamps: number[] = [];

  try {
    const pagesCache = await caches.open("navestory-pages");
    const pageResponse = await pagesCache.match(pathname);
    const pageDate = pageResponse?.headers.get("date");
    if (pageDate) timestamps.push(new Date(pageDate).getTime());
  } catch {
    // Cache Storage indisponível (ex: navegador sem suporte) — segue sem o dado de página.
  }

  try {
    const apiCache = await caches.open("navestory-api-data");
    const requests = await apiCache.keys();
    for (const request of requests) {
      const response = await apiCache.match(request);
      const dateHeader = response?.headers.get("date");
      if (dateHeader) timestamps.push(new Date(dateHeader).getTime());
    }
  } catch {
    // Idem para o cache de dados de API.
  }

  if (timestamps.length === 0) return null;
  return new Date(Math.max(...timestamps));
}
