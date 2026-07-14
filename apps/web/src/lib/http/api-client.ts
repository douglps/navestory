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
    throw new ApiError(body.message ?? "Erro inesperado", response.status);
  }

  return body.data as T;
}
