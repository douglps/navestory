import { decodeJwt } from "jose";

/**
 * @spec SPEC-20260731-008 RF-09
 * Extrai (sem verificar assinatura) `app_metadata.role` do JWT — mesma heurística de UX de
 * `decode-jwt-exp.ts`: a validação de segurança real é sempre feita pelo backend (RolesGuard, S12).
 */
export function decodeJwtRole(token: string): string | null {
  try {
    const payload = decodeJwt(token) as { app_metadata?: { role?: string } };
    return payload.app_metadata?.role ?? null;
  } catch {
    return null;
  }
}
