import { useDashboardStore } from "@/lib/stores/use-dashboard-store";
import { useUIStore } from "@/lib/stores/ui-store";
import { useConnectivityStore } from "@/lib/pwa/connectivity-store";

const REQUEST_TIMEOUT_MS = 10_000;
const OFFLINE_WRITE_MESSAGE =
  "Sem conexão — não é possível salvar agora. Tente novamente quando a internet voltar.";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ApiUnavailableError extends Error {
  constructor(message = "Serviço indisponível. Tente novamente em instantes.") {
    super(message);
    this.name = "ApiUnavailableError";
  }
}

/**
 * @spec SPEC-20260712-001 RF-11, RF-11.1, RF-12
 * Erro específico de mutação bloqueada por falta de conexão — distinto de
 * `ApiUnavailableError` para que a UI mostre a mensagem exata da spec e preserve o
 * formulário (RF-12) em vez de um erro genérico de rede. O toast é disparado centralmente
 * em `apiClient` (mesmo padrão já usado para o aviso de 404 abaixo), então nenhuma tela
 * precisa tratar este erro individualmente.
 */
export class OfflineWriteBlockedError extends Error {
  constructor(message = OFFLINE_WRITE_MESSAGE) {
    super(message);
    this.name = "OfflineWriteBlockedError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
}

/**
 * @spec SPEC-20260524-001 STORY-08
 * Todas as chamadas que dependem de sessão (cookie httpOnly) passam pelo rewrite
 * `/api/backend/*` (mesma origem do Next) — ver next.config.ts.
 */
export async function apiClient<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const isMutation = MUTATING_METHODS.has(method);

  // @spec SPEC-20260712-001 RF-11 — valida R-PWA-02
  // Bloqueia mutação ANTES de qualquer tentativa de rede quando offline. GET nunca é
  // bloqueado aqui: precisa chegar ao fetch() para o Service Worker poder responder com o
  // cache (RF-08) mesmo sem conexão — bloquear GET cedo quebraria a leitura offline inteira.
  if (isMutation && !useConnectivityStore.getState().isOnline) {
    useUIStore.getState().pushToast({ variant: "warning", title: OFFLINE_WRITE_MESSAGE, duration: 5000 });
    throw new OfflineWriteBlockedError();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`/api/backend${path}`, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw new ApiUnavailableError("A requisição demorou demais para responder.");
    }
    // @spec SPEC-20260712-001 RF-11.1, EC-08 — valida R-PWA-08
    // Falha de rede real (TypeError/"Failed to fetch", não uma resposta HTTP de erro) numa
    // mutação é tratada como offline retroativo, mesmo com `navigator.onLine === true`
    // (falso positivo — Wi-Fi de posto sem saída à internet). Corrige o estado global de
    // conectividade (RF-13) e mostra a mesma mensagem de RF-11, nunca um erro genérico.
    if (isMutation) {
      useConnectivityStore.getState().markOffline();
      useUIStore.getState().pushToast({ variant: "warning", title: OFFLINE_WRITE_MESSAGE, duration: 5000 });
      throw new OfflineWriteBlockedError();
    }
    throw new ApiUnavailableError();
  } finally {
    clearTimeout(timeout);
  }

  if (response.status >= 500) {
    throw new ApiUnavailableError();
  }

  const body = (await response.json().catch(() => ({}))) as {
    data?: T;
    message?: string;
  };

  if (!response.ok) {
    if (response.status === 404) {
      handleNotFound(path);
    }
    throw new ApiError(body.message ?? "Erro inesperado", response.status);
  }

  return body.data as T;
}

/**
 * @spec SPEC-20260603-001 RF-22 — limpeza automática de contexto em resposta a 404.
 * Quando um 404 vem de uma request cujo path referencia o `activeVehicleId` ativo no
 * store (ex.: `GET /vehicles/:id`), assume-se que o veículo em foco foi removido
 * (soft-delete) e o contexto é limpo, com aviso na fila única de toasts (§8.2 da
 * SPEC-20260525-001) — sem criar um sistema de notificação novo.
 *
 * Match específico (`path.includes(activeVehicleId)` + `activeVehicleId !== null`)
 * para não disparar em 404s esperados de outras entidades (grupos, categorias etc.).
 */
function handleNotFound(path: string): void {
  const { activeVehicleId, clearAllSelection } = useDashboardStore.getState();
  if (!activeVehicleId || !path.includes(activeVehicleId)) return;

  clearAllSelection();
  useUIStore.getState().pushToast({
    variant: "info",
    title: "O veículo selecionado não está mais disponível",
    duration: 5000,
  });
}
