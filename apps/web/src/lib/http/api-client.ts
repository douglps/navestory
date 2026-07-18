import { useDashboardStore } from "@/lib/stores/use-dashboard-store";
import { useUIStore } from "@/lib/stores/ui-store";

const REQUEST_TIMEOUT_MS = 10_000;

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
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new ApiUnavailableError("Sem conexão com a internet.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`/api/backend${path}`, {
      method: options.method ?? "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw new ApiUnavailableError("A requisição demorou demais para responder.");
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
 * (soft-delete) e o contexto é limpo, com aviso reaproveitando o toast já existente
 * (`ContextStaleToast`) — sem criar um sistema de toast novo.
 *
 * Match específico (`path.includes(activeVehicleId)` + `activeVehicleId !== null`)
 * para não disparar em 404s esperados de outras entidades (grupos, categorias etc.).
 */
function handleNotFound(path: string): void {
  const { activeVehicleId, clearAllSelection } = useDashboardStore.getState();
  if (!activeVehicleId || !path.includes(activeVehicleId)) return;

  clearAllSelection();
  useUIStore.getState().setContextStaleNotice("O veículo selecionado não está mais disponível");
}
