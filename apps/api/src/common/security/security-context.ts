import type { Request } from "express";

/**
 * @spec SPEC-20260807-002 RF-A02 — valida S15
 * Contexto de rede propagado de controllers para services que gravam eventos de segurança de
 * alto risco em audit_logs. Opção A do RF-A02: DTO explícito por parâmetro, sem provider
 * REQUEST-scoped (evitaria mudar o escopo de DI do módulo inteiro).
 */
export interface SecurityContext {
  ip: string;
  userAgent: string;
}

export function extractSecurityContext(req: Request): SecurityContext {
  return {
    ip: req.ip ?? "unknown",
    userAgent: req.headers["user-agent"] ?? "unknown",
  };
}
