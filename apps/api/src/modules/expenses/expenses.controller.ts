import {
  BadRequestException,
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
  UseInterceptors,
  UploadedFile,
  UsePipes,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import {
  RECEIPT_ALLOWED_MIME_TYPES,
  RECEIPT_MAX_SIZE_BYTES,
} from "@navestory/validators";
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
import { fuelStatsDtoSchema, type FuelStatsDto } from "./dto/fuel-stats.dto";
import {
  listExpensesDtoSchema,
  type ListExpensesDto,
} from "./dto/list-expenses.dto";
import {
  supplierSuggestionsDtoSchema,
  type SupplierSuggestionsDto,
} from "./dto/supplier-suggestions.dto";
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
    summary:
      "Sugestões de fornecedores/postos: histórico pessoal (10) + workspace (5)",
  })
  @ApiResponse({
    status: 200,
    description:
      "Lista de sugestões de fornecedor (até 10, pessoais têm precedência)",
  })
  async listSuppliers(
    @Req() req: Request,
    @UserId() userId: string,
    @Query(new ZodValidationPipe(supplierSuggestionsDtoSchema))
    query: SupplierSuggestionsDto,
  ) {
    const accessToken = this.extractAccessToken(req);
    const suppliers = await this.expensesService.getSupplierSuggestions(
      accessToken,
      userId,
      query.q,
      query.workspace_id,
    );
    return { data: suppliers };
  }

  @Get("fuel-stats")
  @ApiOperation({
    summary:
      "Médias históricas de preço/litro e consumo (km/L) para feedback em tempo real",
  })
  @ApiResponse({
    status: 200,
    description:
      "Médias do veículo (null se amostra < 3 abastecimentos com tanque cheio)",
  })
  @ApiResponse({ status: 404, description: "Veículo não encontrado" })
  async getFuelStats(
    @Req() req: Request,
    @UserId() userId: string,
    @Query(new ZodValidationPipe(fuelStatsDtoSchema)) query: FuelStatsDto,
  ) {
    const accessToken = this.extractAccessToken(req);
    const stats = await this.expensesService.getFuelStats(
      accessToken,
      userId,
      query.vehicle_id,
    );
    return { data: stats };
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

  /**
   * @spec SPEC-20260814-004 RF-03, RF-04, RF-09, R-SAN-05
   * `FileInterceptor` sem `storage` configurado usa memória (multer) — `file.buffer` disponível
   * sem gravar em disco. `fileFilter`/`limits` são a 1ª camada de validação (client-facing,
   * mensagens específicas); `ExpensesService.uploadReceipt` revalida (defesa em profundidade,
   * cobre chamadas que não passem pelo interceptor).
   */
  @Post(":id/receipt")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: RECEIPT_MAX_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (
          !RECEIPT_ALLOWED_MIME_TYPES.includes(
            file.mimetype as (typeof RECEIPT_ALLOWED_MIME_TYPES)[number],
          )
        ) {
          callback(
            new BadRequestException(
              "Tipo de arquivo não suportado. Use JPEG, PNG, WebP ou PDF.",
            ),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Anexar comprovante de abastecimento à despesa" })
  @ApiResponse({ status: 201, description: "Comprovante vinculado à despesa" })
  @ApiResponse({
    status: 400,
    description: "Arquivo ausente, tipo não suportado ou acima de 10MB",
  })
  @ApiResponse({ status: 404, description: "Despesa não encontrada" })
  async uploadReceipt(
    @Req() req: Request,
    @UserId() userId: string,
    @Param("id") id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException("Nenhum arquivo enviado");
    }
    const accessToken = this.extractAccessToken(req);
    const expense = await this.expensesService.uploadReceipt(
      accessToken,
      userId,
      id,
      { buffer: file.buffer, mimetype: file.mimetype, size: file.size },
    );
    return { data: expense };
  }

  /**
   * @spec SPEC-20260814-004 RF-07, RNF-03
   */
  @Get(":id/receipt")
  @ApiOperation({
    summary: "Obter URLs assinadas (60min) do comprovante e thumbnail",
  })
  @ApiResponse({ status: 200, description: "URLs assinadas do comprovante" })
  @ApiResponse({ status: 404, description: "Despesa sem comprovante" })
  async getReceipt(
    @Req() req: Request,
    @UserId() userId: string,
    @Param("id") id: string,
  ) {
    const accessToken = this.extractAccessToken(req);
    const urls = await this.expensesService.getReceiptUrls(
      accessToken,
      userId,
      id,
    );
    return { data: urls };
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
      string | undefined;
    if (cookieToken) {
      return cookieToken;
    }
    throw new UnauthorizedException("Token de acesso ausente");
  }
}
