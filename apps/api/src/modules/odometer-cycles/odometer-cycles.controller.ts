import {
  Body,
  Controller,
  Get,
  Param,
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
  createOdometerCycleDtoSchema,
  type CreateOdometerCycleDto,
} from "./dto/create-odometer-cycle.dto";
import { OdometerCyclesService } from "./odometer-cycles.service";

/**
 * @spec SPEC-20260711-001
 */
@ApiTags("odometer-cycles")
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller("vehicles/:vehicleId/odometer-cycles")
export class OdometerCyclesController {
  constructor(private readonly odometerCyclesService: OdometerCyclesService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createOdometerCycleDtoSchema))
  @ApiOperation({ summary: "Registrar novo ciclo de odômetro (reset formal)" })
  @ApiResponse({ status: 201, description: "Ciclo criado" })
  @ApiResponse({ status: 404, description: "Veículo não encontrado" })
  async create(
    @Req() req: Request,
    @UserId() userId: string,
    @Param("vehicleId") vehicleId: string,
    @Body() dto: CreateOdometerCycleDto,
  ) {
    const accessToken = this.extractAccessToken(req);
    const cycle = await this.odometerCyclesService.create(accessToken, userId, vehicleId, dto);
    return { data: cycle };
  }

  @Get()
  @ApiOperation({ summary: "Listar ciclos de odômetro do veículo" })
  @ApiResponse({ status: 200, description: "Lista de ciclos" })
  async findAll(
    @Req() req: Request,
    @UserId() userId: string,
    @Param("vehicleId") vehicleId: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    const accessToken = this.extractAccessToken(req);
    const cycles = await this.odometerCyclesService.findAll(
      accessToken,
      userId,
      vehicleId,
      limit ? Number(limit) : undefined,
      offset ? Number(offset) : undefined,
    );
    return { data: cycles };
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
