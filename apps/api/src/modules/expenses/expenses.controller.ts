import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  UsePipes,
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
import {
  consolidatedExportDtoSchema,
  type ConsolidatedExportDto,
} from "./dto/consolidated-export.dto";
import {
  createExpenseDtoSchema,
  type CreateExpenseDto,
} from "./dto/create-expense.dto";
import {
  expenseKpisDtoSchema,
  type ExpenseKpisDto,
} from "./dto/expense-kpis.dto";
import {
  listExpensesDtoSchema,
  type ListExpensesDto,
} from "./dto/list-expenses.dto";
import {
  upcomingCostsDtoSchema,
  type UpcomingCostsDto,
} from "./dto/upcoming-costs.dto";
import {
  updateExpenseDtoSchema,
  type UpdateExpenseDto,
} from "./dto/update-expense.dto";
import { ExpensesService } from "./expenses.service";

const CSV_BOM = "﻿";

/**
 * @spec SPEC-20260714-001
 */
@ApiTags("expenses")
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller("expenses")
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createExpenseDtoSchema))
  @ApiOperation({ summary: "Registrar despesa" })
  @ApiResponse({ status: 201, description: "Despesa criada" })
  @ApiResponse({ status: 400, description: "Dados inválidos" })
  @ApiResponse({ status: 404, description: "Veículo não encontrado" })
  async create(
    @Req() req: Request,
    @UserId() userId: string,
    @Body() dto: CreateExpenseDto,
    @Query("strict") strict?: string,
  ) {
    const accessToken = this.extractAccessToken(req);
    const expense = await this.expensesService.create(
      accessToken,
      userId,
      dto,
      strict === "true",
    );
    return { data: expense };
  }

  @Get()
  @ApiOperation({ summary: "Listar despesas ativas do usuário (paginado)" })
  @ApiResponse({ status: 200, description: "Lista paginada de despesas" })
  async findAll(
    @Req() req: Request,
    @UserId() userId: string,
    @Query(new ZodValidationPipe(listExpensesDtoSchema)) query: ListExpensesDto,
  ) {
    const accessToken = this.extractAccessToken(req);
    return this.expensesService.findAll(accessToken, userId, query);
  }

  @Get("suppliers")
  @ApiOperation({
    summary: "Sugestões de fornecedores/postos já usados pelo usuário",
  })
  @ApiResponse({
    status: 200,
    description: "Lista de fornecedores (até 10, mais recentes primeiro)",
  })
  async listSuppliers(@Req() req: Request, @UserId() userId: string) {
    const accessToken = this.extractAccessToken(req);
    const suppliers = await this.expensesService.listSuppliers(
      accessToken,
      userId,
    );
    return { data: suppliers };
  }

  @Get("upcoming")
  @ApiOperation({
    summary: "Próximas despesas (manutenções, multas e custos recorrentes)",
  })
  @ApiResponse({ status: 200, description: "Lista ordenada por due_date ASC" })
  @ApiResponse({ status: 400, description: "horizon_days inválido" })
  async getUpcoming(
    @Req() req: Request,
    @Query(new ZodValidationPipe(upcomingCostsDtoSchema))
    query: UpcomingCostsDto,
  ) {
    const accessToken = this.extractAccessToken(req);
    const items = await this.expensesService.getUpcomingCosts(
      accessToken,
      query,
    );
    return { data: items };
  }

  @Get("kpis")
  @ApiOperation({ summary: "KPIs financeiros da central de despesas" })
  @ApiResponse({
    status: 200,
    description:
      "Totais do mês corrente, anterior, histórico e próximos 30 dias",
  })
  async getKpis(
    @Req() req: Request,
    @UserId() userId: string,
    @Query(new ZodValidationPipe(expenseKpisDtoSchema)) query: ExpenseKpisDto,
  ) {
    const accessToken = this.extractAccessToken(req);
    const kpis = await this.expensesService.getKpis(accessToken, userId, query);
    return { data: kpis };
  }

  @Get("export")
  @Throttle({ default: { limit: 10, ttl: 300_000 } })
  @ApiOperation({
    summary: "Exportar CSV consolidado de todas as origens financeiras",
  })
  @ApiResponse({
    status: 200,
    description: "Arquivo CSV com despesas manuais e vinculadas ao ledger",
  })
  async exportConsolidated(
    @Req() req: Request,
    @UserId() userId: string,
    @Query(new ZodValidationPipe(consolidatedExportDtoSchema))
    query: ConsolidatedExportDto,
    @Res() res: Response,
  ): Promise<void> {
    const accessToken = this.extractAccessToken(req);
    const csv = await this.expensesService.exportConsolidatedCsv(
      accessToken,
      userId,
      query,
    );

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="navestory-despesas-completo-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.send(CSV_BOM + csv);
  }

  @Get(":id")
  @ApiOperation({ summary: "Consultar despesa por id" })
  @ApiResponse({ status: 200, description: "Dados da despesa" })
  @ApiResponse({ status: 404, description: "Despesa não encontrada" })
  async findOne(
    @Req() req: Request,
    @UserId() userId: string,
    @Param("id") id: string,
  ) {
    const accessToken = this.extractAccessToken(req);
    const expense = await this.expensesService.findOne(accessToken, userId, id);
    return { data: expense };
  }

  @Patch(":id")
  @UsePipes(new ZodValidationPipe(updateExpenseDtoSchema))
  @ApiOperation({ summary: "Atualizar despesa" })
  @ApiResponse({ status: 200, description: "Despesa atualizada" })
  @ApiResponse({
    status: 400,
    description: "Dados inválidos ou odômetro fora de sequência (strict)",
  })
  @ApiResponse({
    status: 403,
    description: "Despesa vinculada ao ledger (readonly)",
  })
  @ApiResponse({ status: 404, description: "Despesa não encontrada" })
  async update(
    @Req() req: Request,
    @UserId() userId: string,
    @Param("id") id: string,
    @Body() dto: UpdateExpenseDto,
    @Query("strict") strict?: string,
  ) {
    const accessToken = this.extractAccessToken(req);
    const expense = await this.expensesService.update(
      accessToken,
      userId,
      id,
      dto,
      strict === "true",
    );
    return { data: expense };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remover despesa (soft-delete)" })
  @ApiResponse({ status: 204, description: "Despesa removida" })
  @ApiResponse({
    status: 403,
    description: "Despesa vinculada ao ledger (readonly)",
  })
  @ApiResponse({ status: 404, description: "Despesa não encontrada" })
  async remove(
    @Req() req: Request,
    @UserId() userId: string,
    @Param("id") id: string,
  ): Promise<void> {
    const accessToken = this.extractAccessToken(req);
    await this.expensesService.remove(accessToken, userId, id);
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
