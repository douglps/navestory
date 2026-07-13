import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import type { JwtPayload } from "../../modules/auth/jwt.strategy";

export function extractUserId(request: Request & { user?: JwtPayload }): string {
  if (!request.user) {
    throw new Error("UserId() usado fora de uma rota protegida por SupabaseAuthGuard");
  }
  return request.user.sub;
}

export const UserId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string =>
  extractUserId(ctx.switchToHttp().getRequest()),
);
