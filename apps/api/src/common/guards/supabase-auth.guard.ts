import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * @spec SPEC-20260521-001 RULES.md S1
 * Bloqueia rotas sem JWT válido do Supabase Auth (assinatura + expiração via passport-jwt).
 */
@Injectable()
export class SupabaseAuthGuard extends AuthGuard("jwt") {}
