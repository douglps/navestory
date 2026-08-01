import {
  Controller,
  Get,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { Request } from "express";
import { UserId } from "../../common/decorators/user-id.decorator";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import { AuditLogsService } from "./audit-logs.service";

/**
 * @spec SPEC-20260602-005
 */
@ApiTags("audit-logs")
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller("audit-logs")
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @ApiOperation({
    summary: "Listar as últimas 100 entradas do audit log do próprio usuário",
  })
  @ApiResponse({ status: 200, description: "Lista de entradas de audit log" })
  async findRecent(@Req() req: Request, @UserId() userId: string) {
    const accessToken = this.extractAccessToken(req);
    const data = await this.auditLogsService.findRecent(accessToken, userId);
    return { data };
  }

  private extractAccessToken(req: Request): string {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      return header.slice("Bearer ".length);
    }
    const cookieToken = req.cookies?.navestory_access_token as
      | string
      | undefined;
    if (cookieToken) {
      return cookieToken;
    }
    throw new UnauthorizedException("Token de acesso ausente");
  }
}
