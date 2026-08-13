import { UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { jwtVerify, type JWTVerifyGetKey } from "jose";
import type { JwtPayload } from "../../modules/auth/jwt.strategy";

/**
 * @spec SPEC-20260521-001 RULES.md S1
 * Extração de token compartilhada entre `SupabaseAuthGuard` e `SoftDeletedUserGuard` — aceita
 * tanto o header `Authorization: Bearer` quanto o cookie httpOnly `navestory_access_token`.
 */
export function extractSupabaseToken(request: Request): string | null {
  const header = request.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length);
  }
  const cookieToken = (request.cookies as Record<string, string> | undefined)
    ?.navestory_access_token;
  return cookieToken ?? null;
}

/**
 * @spec SPEC-20260521-001 RULES.md S1
 * Valida a assinatura do access token localmente contra o JWKS do GoTrue (ES256, chave
 * assimétrica rotacionável), em vez de round-trip a `auth.getUser()` — essa chamada de rede
 * rodava em toda requisição autenticada e, com o padrão de várias chamadas paralelas por
 * carregamento de tela do frontend, gerava dezenas de requisições concorrentes a
 * `/auth/v1/user` por segundo (achado de performance de Douglas em 2026-08-08).
 */
export async function verifySupabaseJwt(
  token: string,
  jwks: JWTVerifyGetKey,
  supabaseUrl: string,
): Promise<JwtPayload> {
  let claims: Record<string, unknown>;
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `${supabaseUrl}/auth/v1`,
    });
    claims = payload;
  } catch {
    throw new UnauthorizedException("Token inválido ou expirado");
  }

  if (claims.aud !== "authenticated") {
    throw new UnauthorizedException("Token inválido");
  }

  return {
    sub: claims.sub as string,
    email: (claims.email as string) ?? "",
    aud: claims.aud as string,
    app_metadata: claims.app_metadata as { role?: string } | undefined,
  };
}
