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
import { createMaintenanceDtoSchema, type CreateMaintenanceDto } from "./dto/create-maintenance.dto";
import { listMaintenancesDtoSchema, type ListMaintenancesDto } from "./dto/list-maintenances.dto";
import { updateMaintenanceDtoSchema, type UpdateMaintenanceDto } from "./dto/update-maintenance.dto";
import { MaintenancesService } from "./maintenances.service";

/**
 * @spec SPEC-20260715-001
 * @spec SPEC-20260603-002
 */
@ApiTags("maintenances")
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller("maintenances")
export class MaintenancesController {
  constructor(private readonly maintenancesService: MaintenancesService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createMaintenanceDtoSchema))
  @ApiOperation({ summary: "Agendar manutenção" })
  @ApiResponse({ status: 201, description: "Manutenção criada" })
  @ApiResponse({ status: 400, description: "Dados inválidos" })
  @ApiResponse({ status: 404, description: "Veículo não encontrado" })
  async create(
    @Req() req: Request,
    @UserId() userId: string,
    @Body() dto: CreateMaintenanceDto,
  ) {
    const accessToken = this.extractAccessToken(req);
    const maintenance = await this.maintenancesService.create(accessToken, userId, dto);
    return { data: maintenance };
  }

  @Get()
  @ApiOperation({ summary: "Listar manutenções ativas do usuário" })
  @ApiResponse({ status: 200, description: "Lista paginada de manutenções" })
  async findAll(
    @Req() req: Request,
    @UserId() userId: string,
    @Query(new ZodValidationPipe(listMaintenancesDtoSchema)) query: ListMaintenancesDto,
  ) {
    const accessToken = this.extractAccessToken(req);
    const result = await this.maintenancesService.findAll(accessToken, userId, query);
    return result;
  }

  @Get(":id")
  @ApiOperation({ summary: "Consultar manutenção por id" })
  @ApiResponse({ status: 200, description: "Dados da manutenção" })
  @ApiResponse({ status: 404, description: "Manutenção não encontrada" })
  async findOne(@Req() req: Request, @UserId() userId: string, @Param("id") id: string) {
    const accessToken = this.extractAccessToken(req);
    const maintenance = await this.maintenancesService.findOne(accessToken, userId, id);
    return { data: maintenance };
  }

  @Patch(":id")
  @UsePipes(new ZodValidationPipe(updateMaintenanceDtoSchema))
  @ApiOperation({ summary: "Atualizar manutenção (dados ou status)" })
  @ApiResponse({ status: 200, description: "Manutenção atualizada" })
  @ApiResponse({ status: 404, description: "Manutenção não encontrada" })
  @ApiResponse({ status: 409, description: "Transição de status inválida" })
  @ApiResponse({ status: 422, description: "odometer_km obrigatório para concluir" })
  async update(
    @Req() req: Request,
    @UserId() userId: string,
    @Param("id") id: string,
    @Body() dto: UpdateMaintenanceDto,
  ) {
    const accessToken = this.extractAccessToken(req);
    const maintenance = await this.maintenancesService.update(accessToken, userId, id, dto);
    return { data: maintenance };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remover manutenção (soft-delete)" })
  @ApiResponse({ status: 204, description: "Manutenção removida" })
  @ApiResponse({ status: 404, description: "Manutenção não encontrada" })
  async remove(@Req() req: Request, @UserId() userId: string, @Param("id") id: string): Promise<void> {
    const accessToken = this.extractAccessToken(req);
    await this.maintenancesService.remove(accessToken, userId, id);
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
