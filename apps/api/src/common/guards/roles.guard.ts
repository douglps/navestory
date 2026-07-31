import { type CanActivate, type ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { ROLES_KEY } from "../decorators/roles.decorator";
import type { JwtPayload } from "../../modules/auth/jwt.strategy";

/**
 * @spec SPEC-20260521-004 RF-09, RNF-01
 * @spec SPEC-20260731-006 RF-SEC-001 — valida S12
 * Fail-safe: qualquer dúvida (role ausente/não reconhecida) resulta em 403, nunca em acesso.
 * Lê `app_metadata.role`, nunca `user_metadata.role` — este último é gravável pelo próprio
 * usuário via API pública do Supabase, o que permitiria auto-promoção a admin.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    const role = request.user?.app_metadata?.role;
    return typeof role === "string" && requiredRoles.includes(role);
  }
}
