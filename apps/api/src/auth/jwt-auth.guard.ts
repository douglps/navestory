import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * Stub para Fase 0 (T0.3). Bloqueia rotas sem JWT válido via passport-jwt.
 * Guards de role/permissão específicos entram em T1.3.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
