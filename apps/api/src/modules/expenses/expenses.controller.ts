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
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { UserId } from "../../common/decorators/user-id.decorator";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { createExpenseDtoSchema, type CreateExpenseDto } from "./dto/create-expense.dto";
import { listExpensesDtoSchema, type ListExpensesDto } from "./dto/list-expenses.dto";
import { updateExpenseDtoSchema, type UpdateExpenseDto } from "./dto/update-expense.dto";
import { ExpensesService } from "./expenses.service";

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
  async create(@Req() req: Request, @UserId() userId: string, @Body() dto: CreateExpenseDto) {
    const accessToken = this.extractAccessToken(req);
    const expense = await this.expensesService.create(accessToken, userId, dto);
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

  @Get(":id")
  @ApiOperation({ summary: "Consultar despesa por id" })
  @ApiResponse({ status: 200, description: "Dados da despesa" })
  @ApiResponse({ status: 404, description: "Despesa não encontrada" })
  async findOne(@Req() req: Request, @UserId() userId: string, @Param("id") id: string) {
    const accessToken = this.extractAccessToken(req);
    const expense = await this.expensesService.findOne(accessToken, userId, id);
    return { data: expense };
  }

  @Patch(":id")
  @UsePipes(new ZodValidationPipe(updateExpenseDtoSchema))
  @ApiOperation({ summary: "Atualizar despesa" })
  @ApiResponse({ status: 200, description: "Despesa atualizada" })
  @ApiResponse({ status: 403, description: "Despesa vinculada ao ledger (readonly)" })
  @ApiResponse({ status: 404, description: "Despesa não encontrada" })
  async update(
    @Req() req: Request,
    @UserId() userId: string,
    @Param("id") id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    const accessToken = this.extractAccessToken(req);
    const expense = await this.expensesService.update(accessToken, userId, id, dto);
    return { data: expense };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remover despesa (soft-delete)" })
  @ApiResponse({ status: 204, description: "Despesa removida" })
  @ApiResponse({ status: 403, description: "Despesa vinculada ao ledger (readonly)" })
  @ApiResponse({ status: 404, description: "Despesa não encontrada" })
  async remove(@Req() req: Request, @UserId() userId: string, @Param("id") id: string): Promise<void> {
    const accessToken = this.extractAccessToken(req);
    await this.expensesService.remove(accessToken, userId, id);
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
