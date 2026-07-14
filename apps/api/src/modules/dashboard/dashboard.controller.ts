import { Controller, Get, Query, Req, Res, UnauthorizedException, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { UserId } from "../../common/decorators/user-id.decorator";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { DashboardService } from "./dashboard.service";
import { exportExpensesDtoSchema, type ExportExpensesDto } from "./dto/export-expenses.dto";

const CSV_BOM = "﻿";

/**
 * @spec SPEC-20260521-003
 */
@ApiTags("dashboard")
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("export")
  @Throttle({ default: { limit: 10, ttl: 300_000 } })
  @ApiOperation({ summary: "Exportar despesas do período em CSV" })
  @ApiResponse({ status: 200, description: "Arquivo CSV com as despesas do período" })
  @ApiResponse({ status: 400, description: "Período inválido" })
  async exportCsv(
    @Req() req: Request,
    @UserId() userId: string,
    @Query(new ZodValidationPipe(exportExpensesDtoSchema)) query: ExportExpensesDto,
    @Res() res: Response,
  ): Promise<void> {
    const accessToken = this.extractAccessToken(req);
    const csv = await this.dashboardService.exportExpensesCsv(
      accessToken,
      userId,
      query.period,
      query.vehicle_id,
    );

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="nave-despesas-${query.period}.csv"`,
    );
    res.send(CSV_BOM + csv);
  }

  private extractAccessToken(req: Request): string {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      return header.slice("Bearer ".length);
    }
    const cookieToken = req.cookies?.nave_access_token as string | undefined;
    if (cookieToken) {
      return cookieToken;
    }
    throw new UnauthorizedException("Token de acesso ausente");
  }
}
