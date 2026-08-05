import {
  Controller,
  Get,
  Header,
  Param,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { UserId } from "../../common/decorators/user-id.decorator";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { AnalyticsService } from "./analytics.service";
import { anomaliesDtoSchema, type AnomaliesDto } from "./dto/anomalies.dto";
import {
  categorySeriesDtoSchema,
  type CategorySeriesDto,
} from "./dto/category-series.dto";
import {
  exportAnalyticsDtoSchema,
  type ExportAnalyticsDto,
} from "./dto/export-analytics.dto";
import { forecastDtoSchema, type ForecastDto } from "./dto/forecast.dto";
import { fuelTrendDtoSchema, type FuelTrendDto } from "./dto/fuel-trend.dto";
import { insightsDtoSchema, type InsightsDto } from "./dto/insights.dto";
import { seasonalDtoSchema, type SeasonalDto } from "./dto/seasonal.dto";

const CACHE_HEADER = "max-age=3600, stale-while-revalidate=600";
const CSV_BOM = "﻿";

/**
 * @spec SPEC-20260622-001
 */
@ApiTags("analytics")
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("tco/:vehicleId")
  @Header("Cache-Control", CACHE_HEADER)
  @ApiOperation({
    summary:
      "TCO (Total Cost of Ownership) do veículo com breakdown por categoria",
  })
  @ApiResponse({ status: 200, description: "VehicleTco" })
  @ApiResponse({
    status: 404,
    description: "Veículo não encontrado ou não pertence ao usuário",
  })
  async getTco(@Req() req: Request, @Param("vehicleId") vehicleId: string) {
    const accessToken = this.extractAccessToken(req);
    const data = await this.analyticsService.getTco(accessToken, vehicleId);
    return { data };
  }

  @Get("fuel-trend/:vehicleId")
  @Header("Cache-Control", CACHE_HEADER)
  @ApiOperation({
    summary:
      "Tendência de consumo de combustível com rolling average (janela de 5)",
  })
  @ApiResponse({ status: 200, description: "Lista de FuelTrendPoint" })
  @ApiResponse({
    status: 404,
    description: "Veículo não encontrado ou não pertence ao usuário",
  })
  async getFuelTrend(
    @Req() req: Request,
    @Param("vehicleId") vehicleId: string,
    @Query(new ZodValidationPipe(fuelTrendDtoSchema)) query: FuelTrendDto,
  ) {
    const accessToken = this.extractAccessToken(req);
    const data = await this.analyticsService.getFuelTrend(
      accessToken,
      vehicleId,
      query.limit,
    );
    return { data };
  }

  @Get("anomalies")
  @Header("Cache-Control", CACHE_HEADER)
  @ApiOperation({ summary: "Despesas com valor fora do padrão (Z-Score)" })
  @ApiResponse({ status: 200, description: "Lista de ExpenseAnomaly" })
  async getAnomalies(
    @Req() req: Request,
    @Query(new ZodValidationPipe(anomaliesDtoSchema)) query: AnomaliesDto,
  ) {
    const accessToken = this.extractAccessToken(req);
    const data = await this.analyticsService.getAnomalies(
      accessToken,
      query.threshold,
      query.vehicle_id,
    );
    return { data };
  }

  @Get("benchmark")
  @Header("Cache-Control", CACHE_HEADER)
  @ApiOperation({
    summary: "Ranking comparativo de eficiência entre veículos da frota",
  })
  @ApiResponse({ status: 200, description: "Lista de FleetBenchmarkEntry" })
  async getBenchmark(@Req() req: Request) {
    const accessToken = this.extractAccessToken(req);
    const data = await this.analyticsService.getBenchmark(accessToken);
    return { data };
  }

  @Get("forecast")
  @Header("Cache-Control", CACHE_HEADER)
  @ApiOperation({
    summary:
      "Projeção de custos futuros (média móvel de 3 meses, banda de ±1σ)",
  })
  @ApiResponse({ status: 200, description: "Lista de MonthlyForecastPoint" })
  async getForecast(
    @Req() req: Request,
    @Query(new ZodValidationPipe(forecastDtoSchema)) query: ForecastDto,
  ) {
    const accessToken = this.extractAccessToken(req);
    const data = await this.analyticsService.getForecast(
      accessToken,
      query.vehicle_id,
      query.months,
    );
    return { data };
  }

  @Get("seasonal")
  @Header("Cache-Control", CACHE_HEADER)
  @ApiOperation({ summary: "Mapa de calor de gastos por mês x categoria" })
  @ApiResponse({ status: 200, description: "Lista de SeasonalHeatmapCell" })
  async getSeasonal(
    @Req() req: Request,
    @Query(new ZodValidationPipe(seasonalDtoSchema)) query: SeasonalDto,
  ) {
    const accessToken = this.extractAccessToken(req);
    const data = await this.analyticsService.getSeasonal(
      accessToken,
      query.vehicle_id,
    );
    return { data };
  }

  @Get("category-series")
  @Header("Cache-Control", CACHE_HEADER)
  @ApiOperation({
    summary:
      "Série mensal de gastos por categoria (base para correlações temporais)",
  })
  @ApiResponse({
    status: 200,
    description: "Lista de ExpenseCategoryMonthlySeries",
  })
  async getCategorySeries(
    @Req() req: Request,
    @Query(new ZodValidationPipe(categorySeriesDtoSchema))
    query: CategorySeriesDto,
  ) {
    const accessToken = this.extractAccessToken(req);
    const data = await this.analyticsService.getCategorySeries(
      accessToken,
      query.vehicle_id,
    );
    return { data };
  }

  @Get("insights")
  @Header("Cache-Control", CACHE_HEADER)
  @ApiOperation({ summary: "Insights acionáveis em linguagem natural (RF-14)" })
  @ApiResponse({ status: 200, description: "Lista de AnalyticsInsight" })
  async getInsights(
    @Req() req: Request,
    @UserId() userId: string,
    @Query(new ZodValidationPipe(insightsDtoSchema)) query: InsightsDto,
  ) {
    const accessToken = this.extractAccessToken(req);
    const data = await this.analyticsService.getInsights(
      accessToken,
      userId,
      query.vehicle_id,
    );
    return { data };
  }

  @Get("export")
  @Throttle({ default: { limit: 10, ttl: 300_000 } })
  @ApiOperation({ summary: "Exportar TCO e projeção de custos em CSV" })
  @ApiResponse({
    status: 200,
    description: "Arquivo CSV com TCO breakdown + forecast mensal",
  })
  async exportCsv(
    @Req() req: Request,
    @Query(new ZodValidationPipe(exportAnalyticsDtoSchema))
    query: ExportAnalyticsDto,
    @Res() res: Response,
  ): Promise<void> {
    const accessToken = this.extractAccessToken(req);
    const csv = await this.analyticsService.exportCsv(
      accessToken,
      query.vehicle_id,
    );

    const date = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="analytics-${date}.csv"`,
    );
    res.send(CSV_BOM + csv);
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
