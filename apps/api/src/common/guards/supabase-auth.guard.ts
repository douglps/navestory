import {
  CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Request } from "express";
import { SUPABASE_ADMIN_CLIENT } from "../../shared/supabase/supabase.constants";
import type { JwtPayload } from "../../modules/auth/jwt.strategy";

/**
 * @spec SPEC-20260521-001 RULES.md S1
 * Bloqueia rotas sem sessão válida do Supabase Auth. Valida o token chamando `auth.getUser`
 * no próprio Supabase em vez de verificar a assinatura localmente contra um segredo estático:
 * o GoTrue deste projeto assina os access tokens com chave assimétrica rotacionável
 * (ES256/JWKS, padrão do Supabase CLI atual), então `SUPABASE_JWT_SECRET` (HS256, legado) não
 * consegue validar a assinatura — todo token, mesmo válido, era rejeitado com 401 antes desta
 * correção (achado do teste de ambiente local em 2026-07-19). Também aceita o token via cookie
 * httpOnly (`navestory_access_token`), não só via header `Authorization`, alinhando o guard ao
 * mesmo padrão de extração já usado manualmente em cada controller (ver `extractAccessToken`).
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    @Inject(SUPABASE_ADMIN_CLIENT)
    private readonly supabaseAdmin: SupabaseClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload }>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException("Token de acesso ausente");
    }

    const { data, error } = await this.supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      throw new UnauthorizedException("Token inválido ou expirado");
    }

    const payload: JwtPayload = {
      sub: data.user.id,
      email: data.user.email ?? "",
      aud: data.user.aud,
      app_metadata: data.user.app_metadata as { role?: string },
    };
    if (payload.aud !== "authenticated") {
      throw new UnauthorizedException("Token inválido");
    }

    const { data: profile, error: profileError } = await this.supabaseAdmin
      .from("profiles")
      .select("deleted_at")
      .eq("id", payload.sub)
      .maybeSingle();

    if (profileError || !profile) {
      throw new UnauthorizedException("Conta inexistente ou desativada");
    }

    /**
     * @spec SPEC-20260719-002 RF-09
     * Distingue conta em soft-delete (403 + code para o frontend redirecionar ao fluxo de
     * restore) de token inválido/ausente (401 genérico).
     */
    if (profile.deleted_at !== null) {
      throw new ForbiddenException({
        code: "ACCOUNT_PENDING_DELETION",
        deleted_at: profile.deleted_at,
        message: "Conta marcada para exclusão. Faça login para restaurá-la.",
      });
    }

    request.user = payload;
    return true;
  }

  private extractToken(request: Request): string | null {
    const header = request.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      return header.slice("Bearer ".length);
    }
    const cookieToken = (request.cookies as Record<string, string> | undefined)
      ?.navestory_access_token;
    return cookieToken ?? null;
  }
}
