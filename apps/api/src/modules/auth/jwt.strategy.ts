import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ExtractJwt, Strategy, type StrategyOptionsWithoutRequest } from "passport-jwt";
import { SUPABASE_ADMIN_CLIENT } from "../../shared/supabase/supabase.constants";

export interface JwtPayload {
  sub: string;
  email: string;
  aud: string;
  user_metadata?: { role?: string };
}

/**
 * @spec SPEC-20260521-001 RULES.md S1
 * Valida JWT do Supabase Auth: assinatura + expiração (passport-jwt), `aud=authenticated`,
 * e que o profile correspondente não esteja soft-deletado (`profiles.deleted_at IS NULL`).
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @Inject(SUPABASE_ADMIN_CLIENT) private readonly supabaseAdmin: SupabaseClient,
  ) {
    const options: StrategyOptionsWithoutRequest = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>("SUPABASE_JWT_SECRET"),
    };
    super(options);
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (payload.aud !== "authenticated") {
      throw new UnauthorizedException("Token inválido");
    }

    const { data, error } = await this.supabaseAdmin
      .from("profiles")
      .select("deleted_at")
      .eq("id", payload.sub)
      .maybeSingle();

    if (error || !data || data.deleted_at !== null) {
      throw new UnauthorizedException("Conta inexistente ou desativada");
    }

    return payload;
  }
}
