import { decodeJwt } from "jose";

/**
 * Extrai (sem verificar assinatura) o claim `exp` de um JWT, apenas para decidir
 * proativamente se vale a pena tentar renovar a sessão. A validação de segurança real
 * (assinatura, `aud`) é sempre feita pelo backend (S1) — isto é só uma heurística de UX.
 */
export function decodeJwtExp(token: string): number | null {
  try {
    const payload = decodeJwt(token);
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}
