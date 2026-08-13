import {
  CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Request } from "express";
import type { JWTVerifyGetKey } from "jose";
import { SUPABASE_ADMIN_CLIENT, SUPABASE_JWKS } from "../../shared/supabase/supabase.constants";
import type { JwtPayload } from "../../modules/auth/jwt.strategy";
import { extractSupabaseToken, verifySupabaseJwt } from "./supabase-jwt.util";

const PROFILE_CACHE_TTL_MS = 5_000;

/**
 * @spec SPEC-20260521-001 RULES.md S1
 * Bloqueia rotas sem sessão válida do Supabase Auth. Valida a assinatura do access token
 * localmente contra o JWKS do GoTrue (ver `verifySupabaseJwt`) em vez de round-trip a
 * `auth.getUser()` — também aceita o token via cookie httpOnly (`navestory_access_token`),
 * não só via header `Authorization`.
 *
 * A checagem de `profiles.deleted_at` continua sendo uma query real (soft-delete não é algo
 * que dá pra inferir do JWT), mas com cache em memória de 5s por usuário: o dashboard dispara
 * várias chamadas paralelas por carregamento de tela, e sem esse cache cada uma delas pagava
 * a mesma query redundante (achado de performance de Douglas em 2026-08-08).
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly profileCache = new Map<
    string,
    { deletedAt: string | null; expiresAt: number }
  >();

  constructor(
    @Inject(SUPABASE_ADMIN_CLIENT)
    private readonly supabaseAdmin: SupabaseClient,
    @Inject(SUPABASE_JWKS)
    private readonly jwks: JWTVerifyGetKey,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload }>();
    const token = extractSupabaseToken(request);
    if (!token) {
      throw new UnauthorizedException("Token de acesso ausente");
    }

    const supabaseUrl = this.configService.getOrThrow<string>("SUPABASE_URL");
    const payload = await verifySupabaseJwt(token, this.jwks, supabaseUrl);

    const deletedAt = await this.getProfileDeletedAt(payload.sub);
    if (deletedAt === undefined) {
      throw new UnauthorizedException("Conta inexistente ou desativada");
    }

    /**
     * @spec SPEC-20260719-002 RF-09
     * Distingue conta em soft-delete (403 + code para o frontend redirecionar ao fluxo de
     * restore) de token inválido/ausente (401 genérico).
     */
    if (deletedAt !== null) {
      throw new ForbiddenException({
        code: "ACCOUNT_PENDING_DELETION",
        deleted_at: deletedAt,
        message: "Conta marcada para exclusão. Faça login para restaurá-la.",
      });
    }

    request.user = payload;
    return true;
  }

  private async getProfileDeletedAt(userId: string): Promise<string | null | undefined> {
    const cached = this.profileCache.get(userId);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      return cached.deletedAt;
    }

    const { data: profile, error } = await this.supabaseAdmin
      .from("profiles")
      .select("deleted_at")
      .eq("id", userId)
      .maybeSingle();

    if (error || !profile) {
      return undefined;
    }

    this.profileCache.set(userId, {
      deletedAt: profile.deleted_at,
      expiresAt: now + PROFILE_CACHE_TTL_MS,
    });
    return profile.deleted_at;
  }
}
