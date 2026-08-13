import {
  CanActivate,
  type ExecutionContext,
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

/**
 * @spec SPEC-20260719-002 RF-10
 * Mesma validação de JWT local via JWKS do `SupabaseAuthGuard` (ver `verifySupabaseJwt`), mas
 * aceita contas com `profiles.deleted_at IS NOT NULL` — usado exclusivamente em
 * `POST /users/me/restore`, o único endpoint que uma conta em soft-delete pode acessar.
 */
@Injectable()
export class SoftDeletedUserGuard implements CanActivate {
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

    const { data: profile, error: profileError } = await this.supabaseAdmin
      .from("profiles")
      .select("deleted_at")
      .eq("id", payload.sub)
      .maybeSingle();

    if (profileError || !profile) {
      throw new UnauthorizedException("Conta inexistente");
    }

    request.user = payload;
    return true;
  }
}
