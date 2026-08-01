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
  Req,
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
import type { Request } from "express";
import { UserId } from "../../common/decorators/user-id.decorator";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import {
  createExpenseTemplateDtoSchema,
  type CreateExpenseTemplateDto,
} from "./dto/create-expense-template.dto";
import {
  updateExpenseTemplateDtoSchema,
  type UpdateExpenseTemplateDto,
} from "./dto/update-expense-template.dto";
import { ExpenseTemplatesService } from "./expense-templates.service";

/**
 * @spec SPEC-20260601-003
 */
@ApiTags("expense-templates")
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller("expense-templates")
export class ExpenseTemplatesController {
  constructor(
    private readonly expenseTemplatesService: ExpenseTemplatesService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Listar modelos de despesa do usuário, ordenados por uso recente",
  })
  @ApiResponse({ status: 200, description: "Lista de modelos" })
  async findAll(@Req() req: Request, @UserId() userId: string) {
    const accessToken = this.extractAccessToken(req);
    const templates = await this.expenseTemplatesService.findAll(
      accessToken,
      userId,
    );
    return { data: templates };
  }

  @Post()
  @UsePipes(new ZodValidationPipe(createExpenseTemplateDtoSchema))
  @ApiOperation({ summary: "Criar modelo de despesa" })
  @ApiResponse({ status: 201, description: "Modelo criado" })
  @ApiResponse({ status: 404, description: "Veículo não encontrado" })
  @ApiResponse({ status: 422, description: "Limite de 20 modelos atingido" })
  async create(
    @Req() req: Request,
    @UserId() userId: string,
    @Body() dto: CreateExpenseTemplateDto,
  ) {
    const accessToken = this.extractAccessToken(req);
    const template = await this.expenseTemplatesService.create(
      accessToken,
      userId,
      dto,
    );
    return { data: template };
  }

  @Patch(":id")
  @UsePipes(new ZodValidationPipe(updateExpenseTemplateDtoSchema))
  @ApiOperation({ summary: "Atualizar modelo de despesa (nome ou campos)" })
  @ApiResponse({ status: 200, description: "Modelo atualizado" })
  @ApiResponse({ status: 404, description: "Modelo não encontrado" })
  async update(
    @Req() req: Request,
    @UserId() userId: string,
    @Param("id") id: string,
    @Body() dto: UpdateExpenseTemplateDto,
  ) {
    const accessToken = this.extractAccessToken(req);
    const template = await this.expenseTemplatesService.update(
      accessToken,
      userId,
      id,
      dto,
    );
    return { data: template };
  }

  @Patch(":id/touch")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Marcar modelo como usado agora (bump de last_used_at)",
  })
  @ApiResponse({ status: 200, description: "Modelo atualizado" })
  @ApiResponse({ status: 404, description: "Modelo não encontrado" })
  async touch(
    @Req() req: Request,
    @UserId() userId: string,
    @Param("id") id: string,
  ) {
    const accessToken = this.extractAccessToken(req);
    const template = await this.expenseTemplatesService.touch(
      accessToken,
      userId,
      id,
    );
    return { data: template };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remover modelo de despesa (hard delete)" })
  @ApiResponse({ status: 204, description: "Modelo removido" })
  @ApiResponse({ status: 404, description: "Modelo não encontrado" })
  async remove(
    @Req() req: Request,
    @UserId() userId: string,
    @Param("id") id: string,
  ): Promise<void> {
    const accessToken = this.extractAccessToken(req);
    await this.expenseTemplatesService.remove(accessToken, userId, id);
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
