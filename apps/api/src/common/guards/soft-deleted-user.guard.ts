import { CanActivate, type ExecutionContext, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Request } from "express";
import { SUPABASE_ADMIN_CLIENT } from "../../shared/supabase/supabase.constants";
import type { JwtPayload } from "../../modules/auth/jwt.strategy";

/**
 * @spec SPEC-20260719-002 RF-10
 * Mesma validação de JWT via Supabase Auth do `SupabaseAuthGuard`, mas aceita contas com
 * `profiles.deleted_at IS NOT NULL` — usado exclusivamente em `POST /users/me/restore`, o
 * único endpoint que uma conta em soft-delete pode acessar.
 */
@Injectable()
export class SoftDeletedUserGuard implements CanActivate {
  constructor(@Inject(SUPABASE_ADMIN_CLIENT) private readonly supabaseAdmin: SupabaseClient) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
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
      throw new UnauthorizedException("Conta inexistente");
    }

    request.user = payload;
    return true;
  }

  private extractToken(request: Request): string | null {
    const header = request.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      return header.slice("Bearer ".length);
    }
    const cookieToken = (request.cookies as Record<string, string> | undefined)?.nave_access_token;
    return cookieToken ?? null;
  }
}
