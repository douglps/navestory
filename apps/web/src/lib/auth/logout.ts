import { apiClient } from "@/lib/http/api-client";
import { useDashboardStore } from "@/lib/stores/use-dashboard-store";

/**
 * Encerra a sessão no backend e limpa todo o contexto global do store,
 * incluindo os modos efêmeros `multi`/`attribute` que sobrevivem em memória.
 * @spec SPEC-20260602-001 RF-19
 * @spec SPEC-20260603-001 RF-23 — remoção explícita do sessionStorage: `clearAllSelection()`
 * só reseta o estado em memória, o que dispara um novo `set()` que persiste o storage;
 * a remoção explícita garante que nenhum contexto vaze entre sessões de usuários
 * diferentes no mesmo dispositivo, mesmo que o `set()` falhe silenciosamente.
 */
export async function logout(): Promise<void> {
  try {
    await apiClient<void>("/auth/logout", { method: "POST" });
  } catch {
    // Falha de rede não deve impedir a limpeza local do contexto/sessão.
  } finally {
    useDashboardStore.getState().clearAllSelection();
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem("nave-dashboard-context");
    }
    window.location.href = "/login";
  }
}
