import { AsyncLocalStorage } from "node:async_hooks";

interface RequestContextStore {
  requestId?: string;
}

/**
 * @spec SPEC-20260602-005 RF-07
 * Propaga o requestId (gerado pelo pino-http, SPEC-20260716-002 RF-08) para fora do
 * ciclo request/response, permitindo que o AuditService grave a correlação sem exigir
 * que cada caller passe o requestId explicitamente.
 */
export const requestContextStorage = new AsyncLocalStorage<RequestContextStore>();

export function getCurrentRequestId(): string | undefined {
  return requestContextStorage.getStore()?.requestId;
}
