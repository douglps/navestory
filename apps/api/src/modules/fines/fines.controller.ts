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
import { createFineDtoSchema, type CreateFineDto } from "./dto/create-fine.dto";
import { listFinesDtoSchema, type ListFinesDto } from "./dto/list-fines.dto";
import { updateFineDtoSchema, type UpdateFineDto } from "./dto/update-fine.dto";
import { FinesService } from "./fines.service";

/**
 * @spec SPEC-20260607-001
 */
@ApiTags("fines")
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller("fines")
export class FinesController {
  constructor(private readonly finesService: FinesService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createFineDtoSchema))
  @ApiOperation({ summary: "Registrar multa de trânsito" })
  @ApiResponse({ status: 201, description: "Multa criada" })
  @ApiResponse({ status: 400, description: "Dados inválidos" })
  @ApiResponse({ status: 404, description: "Veículo não encontrado" })
  async create(@Req() req: Request, @UserId() userId: string, @Body() dto: CreateFineDto) {
    const accessToken = this.extractAccessToken(req);
    const fine = await this.finesService.create(accessToken, userId, dto);
    return { data: fine };
  }

  @Get()
  @ApiOperation({ summary: "Listar multas ativas do usuário, com filtro opcional por status" })
  @ApiResponse({ status: 200, description: "Lista de multas" })
  async findAll(
    @Req() req: Request,
    @UserId() userId: string,
    @Query(new ZodValidationPipe(listFinesDtoSchema)) query: ListFinesDto,
  ) {
    const accessToken = this.extractAccessToken(req);
    const fines = await this.finesService.findAll(accessToken, userId, query.status);
    return { data: fines };
  }

  @Get("vehicle/:vehicleId")
  @ApiOperation({ summary: "Listar multas de um veículo específico" })
  @ApiResponse({ status: 200, description: "Lista de multas do veículo" })
  @ApiResponse({ status: 404, description: "Veículo não encontrado" })
  async findByVehicle(
    @Req() req: Request,
    @UserId() userId: string,
    @Param("vehicleId") vehicleId: string,
  ) {
    const accessToken = this.extractAccessToken(req);
    const fines = await this.finesService.findByVehicle(accessToken, userId, vehicleId);
    return { data: fines };
  }

  @Get(":id")
  @ApiOperation({ summary: "Consultar multa por id" })
  @ApiResponse({ status: 200, description: "Dados da multa" })
  @ApiResponse({ status: 404, description: "Multa não encontrada" })
  async findOne(@Req() req: Request, @UserId() userId: string, @Param("id") id: string) {
    const accessToken = this.extractAccessToken(req);
    const fine = await this.finesService.findOne(accessToken, userId, id);
    return { data: fine };
  }

  @Patch(":id")
  @UsePipes(new ZodValidationPipe(updateFineDtoSchema))
  @ApiOperation({ summary: "Atualizar multa (dados ou status)" })
  @ApiResponse({ status: 200, description: "Multa atualizada" })
  @ApiResponse({ status: 404, description: "Multa não encontrada" })
  @ApiResponse({ status: 409, description: "Transição de status inválida" })
  async update(
    @Req() req: Request,
    @UserId() userId: string,
    @Param("id") id: string,
    @Body() dto: UpdateFineDto,
  ) {
    const accessToken = this.extractAccessToken(req);
    const fine = await this.finesService.update(accessToken, userId, id, dto);
    return { data: fine };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remover multa (soft-delete)" })
  @ApiResponse({ status: 204, description: "Multa removida" })
  @ApiResponse({ status: 404, description: "Multa não encontrada" })
  async remove(@Req() req: Request, @UserId() userId: string, @Param("id") id: string): Promise<void> {
    const accessToken = this.extractAccessToken(req);
    await this.finesService.remove(accessToken, userId, id);
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
