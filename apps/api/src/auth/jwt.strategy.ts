import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy, type StrategyOptionsWithoutRequest } from "passport-jwt";

export interface JwtPayload {
  sub: string;
  email: string;
}

/**
 * Stub para Fase 0 (T0.3) — habilita o guard `jwt` sem regra de negócio real.
 * A estratégia completa (validação contra Supabase Auth) é implementada em T1.1.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const options: StrategyOptionsWithoutRequest = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.SUPABASE_JWT_SECRET ?? "stub-secret-fase-0",
    };
    super(options);
  }

  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
