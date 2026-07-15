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
import {
  createRecurringCostDtoSchema,
  type CreateRecurringCostDto,
} from "./dto/create-recurring-cost.dto";
import {
  listRecurringCostsDtoSchema,
  type ListRecurringCostsDto,
} from "./dto/list-recurring-costs.dto";
import {
  updateRecurringCostDtoSchema,
  type UpdateRecurringCostDto,
} from "./dto/update-recurring-cost.dto";
import { RecurringCostsService } from "./recurring-costs.service";

/**
 * @spec SPEC-20260609-001
 */
@ApiTags("recurring-costs")
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller("recurring-costs")
export class RecurringCostsController {
  constructor(private readonly recurringCostsService: RecurringCostsService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createRecurringCostDtoSchema))
  @ApiOperation({ summary: "Registrar custo recorrente (IPVA, CRLV, Seguro, outros)" })
  @ApiResponse({ status: 201, description: "Custo recorrente criado" })
  @ApiResponse({ status: 404, description: "Veículo não encontrado" })
  @ApiResponse({ status: 409, description: "Já existe registro para vehicle_id+cost_type+year" })
  async create(
    @Req() req: Request,
    @UserId() userId: string,
    @Body() dto: CreateRecurringCostDto,
  ) {
    const accessToken = this.extractAccessToken(req);
    const recurringCost = await this.recurringCostsService.create(accessToken, userId, dto);
    return { data: recurringCost };
  }

  @Get()
  @ApiOperation({ summary: "Listar custos recorrentes do usuário, com filtros opcionais" })
  @ApiResponse({ status: 200, description: "Lista ordenada por due_date ASC" })
  async findAll(
    @Req() req: Request,
    @UserId() userId: string,
    @Query(new ZodValidationPipe(listRecurringCostsDtoSchema)) query: ListRecurringCostsDto,
  ) {
    const accessToken = this.extractAccessToken(req);
    const items = await this.recurringCostsService.findAll(accessToken, userId, query);
    return { data: items };
  }

  @Get(":id")
  @ApiOperation({ summary: "Consultar custo recorrente por id" })
  @ApiResponse({ status: 200, description: "Dados do custo recorrente" })
  @ApiResponse({ status: 404, description: "Custo recorrente não encontrado" })
  async findOne(@Req() req: Request, @UserId() userId: string, @Param("id") id: string) {
    const accessToken = this.extractAccessToken(req);
    const recurringCost = await this.recurringCostsService.findOne(accessToken, userId, id);
    return { data: recurringCost };
  }

  @Patch(":id")
  @UsePipes(new ZodValidationPipe(updateRecurringCostDtoSchema))
  @ApiOperation({ summary: "Atualizar custo recorrente (inclui registrar pagamento via paid_at)" })
  @ApiResponse({ status: 200, description: "Custo recorrente atualizado" })
  @ApiResponse({ status: 404, description: "Custo recorrente não encontrado" })
  async update(
    @Req() req: Request,
    @UserId() userId: string,
    @Param("id") id: string,
    @Body() dto: UpdateRecurringCostDto,
  ) {
    const accessToken = this.extractAccessToken(req);
    const recurringCost = await this.recurringCostsService.update(accessToken, userId, id, dto);
    return { data: recurringCost };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remover custo recorrente (soft-delete, propaga para a expense vinculada)" })
  @ApiResponse({ status: 204, description: "Custo recorrente removido" })
  @ApiResponse({ status: 404, description: "Custo recorrente não encontrado" })
  async remove(@Req() req: Request, @UserId() userId: string, @Param("id") id: string): Promise<void> {
    const accessToken = this.extractAccessToken(req);
    await this.recurringCostsService.remove(accessToken, userId, id);
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
