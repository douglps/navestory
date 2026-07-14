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
  Put,
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
import { createGroupDtoSchema, type CreateGroupDto } from "./dto/create-group.dto";
import { setGroupMembersDtoSchema, type SetGroupMembersDto } from "./dto/set-group-members.dto";
import { updateGroupDtoSchema, type UpdateGroupDto } from "./dto/update-group.dto";
import { VehicleGroupsService } from "./vehicle-groups.service";

/**
 * @spec SPEC-20260602-003
 */
@ApiTags("vehicle-groups")
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller("vehicle-groups")
export class VehicleGroupsController {
  constructor(private readonly vehicleGroupsService: VehicleGroupsService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createGroupDtoSchema))
  @ApiOperation({ summary: "Criar grupo de veículos" })
  @ApiResponse({ status: 201, description: "Grupo criado" })
  @ApiResponse({ status: 400, description: "Nome ou cor inválidos" })
  async create(@Req() req: Request, @UserId() userId: string, @Body() dto: CreateGroupDto) {
    const accessToken = this.extractAccessToken(req);
    const group = await this.vehicleGroupsService.create(accessToken, userId, dto);
    return { data: group };
  }

  @Get()
  @ApiOperation({ summary: "Listar grupos do usuário com contagem de membros" })
  @ApiResponse({ status: 200, description: "Lista de grupos" })
  async findAll(@Req() req: Request, @UserId() userId: string) {
    const accessToken = this.extractAccessToken(req);
    const groups = await this.vehicleGroupsService.findAll(accessToken, userId);
    return { data: groups };
  }

  @Patch(":id")
  @UsePipes(new ZodValidationPipe(updateGroupDtoSchema))
  @ApiOperation({ summary: "Atualizar nome/cor do grupo" })
  @ApiResponse({ status: 200, description: "Grupo atualizado" })
  @ApiResponse({ status: 404, description: "Grupo não encontrado" })
  async update(
    @Req() req: Request,
    @UserId() userId: string,
    @Param("id") id: string,
    @Body() dto: UpdateGroupDto,
  ) {
    const accessToken = this.extractAccessToken(req);
    const group = await this.vehicleGroupsService.update(accessToken, userId, id, dto);
    return { data: group };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remover grupo (hard-delete, membros por cascade)" })
  @ApiResponse({ status: 204, description: "Grupo removido" })
  @ApiResponse({ status: 404, description: "Grupo não encontrado" })
  async remove(@Req() req: Request, @UserId() userId: string, @Param("id") id: string): Promise<void> {
    const accessToken = this.extractAccessToken(req);
    await this.vehicleGroupsService.remove(accessToken, userId, id);
  }

  @Put(":id/members")
  @UsePipes(new ZodValidationPipe(setGroupMembersDtoSchema))
  @ApiOperation({ summary: "Substituir todos os membros do grupo (replace-all)" })
  @ApiResponse({ status: 200, description: "Membros atualizados" })
  @ApiResponse({ status: 404, description: "Grupo não encontrado" })
  async setMembers(
    @Req() req: Request,
    @UserId() userId: string,
    @Param("id") id: string,
    @Body() dto: SetGroupMembersDto,
  ) {
    const accessToken = this.extractAccessToken(req);
    const result = await this.vehicleGroupsService.setMembers(accessToken, userId, id, dto);
    return { data: result };
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
