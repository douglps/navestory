import { apiClient } from "@/lib/http/api-client";
import { useDashboardStore } from "@/lib/stores/use-dashboard-store";

/**
 * Encerra a sessão no backend e limpa todo o contexto global do store,
 * incluindo os modos efêmeros `multi`/`attribute` que sobrevivem em memória.
 * @spec SPEC-20260602-001 RF-19
 */
export async function logout(): Promise<void> {
  try {
    await apiClient<void>("/auth/logout", { method: "POST" });
  } catch {
    // Falha de rede não deve impedir a limpeza local do contexto/sessão.
  } finally {
    useDashboardStore.getState().clearAllSelection();
    window.location.href = "/login";
  }
}
