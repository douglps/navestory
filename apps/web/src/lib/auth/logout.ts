import { apiClient } from "@/lib/http/api-client";
import { useDashboardStore } from "@/lib/stores/use-dashboard-store";
import { clearApiCache } from "@/lib/pwa/clear-api-cache";
import { EASTER_EGG_SEEN_KEY } from "@/lib/analytics/easter-egg-heatmap";

/**
 * Encerra a sessão no backend e limpa todo o contexto global do store,
 * incluindo os modos efêmeros `multi`/`attribute` que sobrevivem em memória.
 * @spec SPEC-20260602-001 RF-19
 * @spec SPEC-20260603-001 RF-23 — remoção explícita do sessionStorage: `clearAllSelection()`
 * só reseta o estado em memória, o que dispara um novo `set()` que persiste o storage;
 * a remoção explícita garante que nenhum contexto vaze entre sessões de usuários
 * diferentes no mesmo dispositivo, mesmo que o `set()` falhe silenciosamente.
 * @spec SPEC-20260712-001 RF-16, RF-17, S6 — valida S6
 * Limpa também o Cache Storage de dados de API (dispositivo compartilhado, ex: tablets de
 * frota) antes de redirecionar, para que um segundo usuário nunca veja dado residual do
 * anterior (RF-17), nem mesmo brevemente antes da 1ª resposta de rede completar.
 */
export async function logout(): Promise<void> {
  try {
    await apiClient<void>("/auth/logout", { method: "POST" });
  } catch {
    // Falha de rede não deve impedir a limpeza local do contexto/sessão.
  } finally {
    useDashboardStore.getState().clearAllSelection();
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem("navestory-dashboard-context");
      // @spec SPEC-20260730-002 RF-07 — colapso da sidebar não deve vazar entre sessões.
      sessionStorage.removeItem("navestory-ui-state");
    }
    // @spec SPEC-20260801-001 RF-06 — ponto pulsante do easter egg pode reaparecer em nova
    // sessão no mesmo dispositivo (localStorage, não sessionStorage; comportamento aceito).
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(EASTER_EGG_SEEN_KEY);
    }
    await clearApiCache();
    window.location.href = "/login";
  }
}
