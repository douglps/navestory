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
  createVehicleDtoSchema,
  type CreateVehicleDto,
} from "./dto/create-vehicle.dto";
import {
  updateVehicleDtoSchema,
  type UpdateVehicleDto,
} from "./dto/update-vehicle.dto";
import { VehiclesService } from "./vehicles.service";

/**
 * @spec SPEC-20260602-002
 */
@ApiTags("vehicles")
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller("vehicles")
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createVehicleDtoSchema))
  @ApiOperation({ summary: "Cadastrar veículo" })
  @ApiResponse({ status: 201, description: "Veículo criado" })
  @ApiResponse({
    status: 400,
    description: "Dados inválidos (schema Zod ou placa)",
  })
  async create(
    @Req() req: Request,
    @UserId() userId: string,
    @Body() dto: CreateVehicleDto,
  ) {
    const accessToken = this.extractAccessToken(req);
    const vehicle = await this.vehiclesService.create(accessToken, userId, dto);
    return { data: vehicle };
  }

  @Get()
  @ApiOperation({ summary: "Listar veículos ativos do usuário" })
  @ApiResponse({ status: 200, description: "Lista de veículos" })
  async findAll(@Req() req: Request, @UserId() userId: string) {
    const accessToken = this.extractAccessToken(req);
    const vehicles = await this.vehiclesService.findAll(accessToken, userId);
    return { data: vehicles };
  }

  @Get(":id")
  @ApiOperation({ summary: "Consultar veículo por id" })
  @ApiResponse({ status: 200, description: "Dados do veículo" })
  @ApiResponse({ status: 404, description: "Veículo não encontrado" })
  async findOne(
    @Req() req: Request,
    @UserId() userId: string,
    @Param("id") id: string,
  ) {
    const accessToken = this.extractAccessToken(req);
    const vehicle = await this.vehiclesService.findOne(accessToken, userId, id);
    return { data: vehicle };
  }

  /**
   * @spec SPEC-20260730-001 RF-19
   */
  @Get(":id/health")
  @ApiOperation({
    summary: "Calcular e retornar a saúde do veículo (score + flags)",
  })
  @ApiResponse({ status: 200, description: "Score e flags de saúde" })
  @ApiResponse({ status: 404, description: "Veículo não encontrado" })
  async getHealth(@Req() req: Request, @Param("id") id: string) {
    const accessToken = this.extractAccessToken(req);
    const health = await this.vehiclesService.getHealth(accessToken, id);
    return { data: health };
  }

  @Patch(":id")
  @UsePipes(new ZodValidationPipe(updateVehicleDtoSchema))
  @ApiOperation({ summary: "Atualizar veículo" })
  @ApiResponse({ status: 200, description: "Veículo atualizado" })
  @ApiResponse({ status: 404, description: "Veículo não encontrado" })
  async update(
    @Req() req: Request,
    @UserId() userId: string,
    @Param("id") id: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    const accessToken = this.extractAccessToken(req);
    const vehicle = await this.vehiclesService.update(
      accessToken,
      userId,
      id,
      dto,
    );
    return { data: vehicle };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remover veículo (soft-delete em cascata)" })
  @ApiResponse({ status: 204, description: "Veículo removido" })
  @ApiResponse({ status: 404, description: "Veículo não encontrado" })
  async remove(
    @Req() req: Request,
    @UserId() userId: string,
    @Param("id") id: string,
  ): Promise<void> {
    const accessToken = this.extractAccessToken(req);
    await this.vehiclesService.remove(accessToken, userId, id);
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
