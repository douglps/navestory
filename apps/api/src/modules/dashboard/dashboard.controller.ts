import { Controller, Get, Query, Req, Res, UnauthorizedException, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { UserId } from "../../common/decorators/user-id.decorator";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { DashboardService } from "./dashboard.service";
import { categorySummaryDtoSchema, type CategorySummaryDto } from "./dto/category-summary.dto";
import { exportExpensesDtoSchema, type ExportExpensesDto } from "./dto/export-expenses.dto";
import { fleetKpisDtoSchema, type FleetKpisDto } from "./dto/fleet-kpis.dto";
import { vehicleHistoryDtoSchema, type VehicleHistoryDto } from "./dto/vehicle-history.dto";

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

  @Get("fleet-health")
  @ApiOperation({ summary: "Score de saúde de cada veículo da frota (RF-SH-01, RF-SH-02)" })
  @ApiResponse({ status: 200, description: "Lista de { vehicle_id, score, flags }" })
  async getFleetHealth(@Req() req: Request, @UserId() userId: string) {
    const accessToken = this.extractAccessToken(req);
    const data = await this.dashboardService.getFleetHealth(accessToken, userId);
    return { data };
  }

  @Get("alerts")
  @ApiOperation({ summary: "Alertas críticos da frota, ordenados por urgência (RF-DA-01)" })
  @ApiResponse({ status: 200, description: "Lista de alertas de manutenção vencida/próxima" })
  async getAlerts(@Req() req: Request, @UserId() userId: string) {
    const accessToken = this.extractAccessToken(req);
    const data = await this.dashboardService.getAlerts(accessToken, userId);
    return { data };
  }

  @Get("fleet-kpis")
  @ApiOperation({ summary: "KPIs do mês da Zona A: gastos, manutenções urgentes, custo/km, próxima manutenção (RF-DA-03)" })
  @ApiResponse({ status: 200, description: "Cada KPI com { ok: true, value } ou { ok: false } isoladamente" })
  async getFleetKpis(
    @Req() req: Request,
    @UserId() userId: string,
    @Query(new ZodValidationPipe(fleetKpisDtoSchema)) query: FleetKpisDto,
  ) {
    const accessToken = this.extractAccessToken(req);
    const data = await this.dashboardService.getFleetKpis(accessToken, userId, query.vehicle_id);
    return { data };
  }

  @Get("kpi-catalog")
  @ApiOperation({
    summary:
      "Catálogo completo de KPIs configuráveis do dashboard (RF-01) — o frontend filtra pelos ids ativos em user_preferences.dashboard_kpi_ids",
  })
  @ApiResponse({ status: 200, description: "Cada KPI do catálogo com { ok: true, value } ou { ok: false } isoladamente" })
  async getFleetKpiCatalog(
    @Req() req: Request,
    @UserId() userId: string,
    @Query(new ZodValidationPipe(fleetKpisDtoSchema)) query: FleetKpisDto,
  ) {
    const accessToken = this.extractAccessToken(req);
    const data = await this.dashboardService.getFleetKpiCatalog(accessToken, userId, query.vehicle_id);
    return { data };
  }

  @Get("vehicle-cards")
  @ApiOperation({ summary: "Cards de veículo da Zona A: odômetro, último abastecimento, status de documentos (RF-DA-04)" })
  @ApiResponse({ status: 200, description: "Lista de VehicleCard" })
  async getVehicleCards(@Req() req: Request, @UserId() userId: string) {
    const accessToken = this.extractAccessToken(req);
    const data = await this.dashboardService.getVehicleCards(accessToken, userId);
    return { data };
  }

  @Get("vehicle-history")
  @ApiOperation({ summary: "Últimas 20 despesas + manutenções do veículo, por data decrescente (RF-DB-07)" })
  @ApiResponse({ status: 200, description: "Lista de VehicleHistoryItem" })
  async getVehicleHistory(
    @Req() req: Request,
    @UserId() userId: string,
    @Query(new ZodValidationPipe(vehicleHistoryDtoSchema)) query: VehicleHistoryDto,
  ) {
    const accessToken = this.extractAccessToken(req);
    const data = await this.dashboardService.getVehicleHistory(accessToken, userId, query.vehicle_id);
    return { data };
  }

  @Get("spending-highlights")
  @ApiOperation({ summary: "Top-3 categorias de gasto do mês corrente, com respeito ao contexto ativo (RF-01)" })
  @ApiResponse({ status: 200, description: "Lista de até 3 CategorySummaryItem, ordenados por total decrescente" })
  async getSpendingHighlights(
    @Req() req: Request,
    @Query(new ZodValidationPipe(categorySummaryDtoSchema)) query: CategorySummaryDto,
  ) {
    const accessToken = this.extractAccessToken(req);
    const data = await this.dashboardService.getSpendingHighlights(
      accessToken,
      query.vehicleId,
      query.groupIds,
    );
    return { data };
  }

  @Get("fines-status")
  @ApiOperation({ summary: "Status agregado das multas ativas do usuário (RF-02)" })
  @ApiResponse({ status: 200, description: "{ status: 'none' | 'open' | 'overdue', count }" })
  async getFinesStatus(@Req() req: Request, @UserId() userId: string) {
    const accessToken = this.extractAccessToken(req);
    const data = await this.dashboardService.getFinesStatus(accessToken, userId);
    return { data };
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
