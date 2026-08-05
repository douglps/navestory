import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserId } from "../../common/decorators/user-id.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { assignVehicleDtoSchema, type AssignVehicleDto } from "./dto/assign-vehicle.dto";
import { createInviteDtoSchema, type CreateInviteDto } from "./dto/create-invite.dto";
import { createWorkspaceDtoSchema, type CreateWorkspaceDto } from "./dto/create-workspace.dto";
import { WorkspacesService } from "./workspaces.service";

/**
 * @spec specs/workspace/SPEC-20260804-004-workspace-foundation.md
 */
@ApiTags("workspaces")
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller("workspaces")
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createWorkspaceDtoSchema))
  @ApiOperation({ summary: "Criar workspace e se tornar workspace_owner" })
  @ApiResponse({ status: 201, description: "Workspace criado" })
  @ApiResponse({ status: 409, description: "Usuário já é owner de outro workspace" })
  async create(@Req() req: Request, @UserId() userId: string, @Body() dto: CreateWorkspaceDto) {
    const accessToken = this.extractAccessToken(req);
    const data = await this.workspacesService.createWorkspace(accessToken, userId, dto);
    return { data };
  }

  @Get("me")
  @ApiOperation({ summary: "Workspace do usuário autenticado (owner ou member)" })
  @ApiResponse({ status: 200, description: "Workspace encontrado" })
  @ApiResponse({ status: 404, description: "Usuário não pertence a nenhum workspace" })
  async getMine(@Req() req: Request, @UserId() userId: string) {
    const accessToken = this.extractAccessToken(req);
    const data = await this.workspacesService.getMyWorkspace(accessToken, userId);
    return { data };
  }

  @Post(":id/invites")
  @UseGuards(RolesGuard)
  @Roles("workspace_owner")
  @UsePipes(new ZodValidationPipe(createInviteDtoSchema))
  @ApiOperation({ summary: "Gerar link de convite para um motorista (sem envio de e-mail)" })
  @ApiResponse({ status: 201, description: "Convite criado" })
  async createInvite(
    @Req() req: Request,
    @UserId() userId: string,
    @Param("id") workspaceId: string,
    @Body() dto: CreateInviteDto,
  ) {
    const accessToken = this.extractAccessToken(req);
    const data = await this.workspacesService.createInvite(accessToken, userId, workspaceId, dto);
    return { data };
  }

  @Get("invites/:token")
  @ApiOperation({ summary: "Dados públicos do convite, para a tela de aceite" })
  @ApiResponse({ status: 200, description: "Convite válido" })
  @ApiResponse({ status: 404, description: "Convite inválido ou expirado" })
  async getInvite(@Param("token") token: string) {
    const data = await this.workspacesService.getInviteByToken(token);
    return { data };
  }

  @Post("invites/:token/accept")
  @ApiOperation({ summary: "Aceitar convite e se tornar workspace_member" })
  @ApiResponse({ status: 201, description: "Convite aceito" })
  @ApiResponse({ status: 409, description: "Usuário já pertence a um workspace" })
  async acceptInvite(@UserId() userId: string, @Param("token") token: string) {
    const data = await this.workspacesService.acceptInvite(userId, token);
    return { data };
  }

  @Get(":id/members")
  @UseGuards(RolesGuard)
  @Roles("workspace_owner")
  @ApiOperation({ summary: "Listar membros ativos do workspace" })
  @ApiResponse({ status: 200, description: "Lista de membros" })
  async listMembers(@Req() req: Request, @UserId() userId: string, @Param("id") workspaceId: string) {
    const accessToken = this.extractAccessToken(req);
    const data = await this.workspacesService.listMembers(accessToken, userId, workspaceId);
    return { data };
  }

  @Delete(":id/members/:memberId")
  @UseGuards(RolesGuard)
  @Roles("workspace_owner")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remover membro do workspace" })
  @ApiResponse({ status: 204, description: "Membro removido" })
  @ApiResponse({ status: 404, description: "Membro não encontrado" })
  async removeMember(
    @Req() req: Request,
    @UserId() userId: string,
    @Param("id") workspaceId: string,
    @Param("memberId") memberId: string,
  ): Promise<void> {
    const accessToken = this.extractAccessToken(req);
    await this.workspacesService.removeMember(accessToken, userId, workspaceId, memberId);
  }

  @Get(":id/vehicle-assignments")
  @UseGuards(RolesGuard)
  @Roles("workspace_owner")
  @ApiOperation({ summary: "Listar atribuições de veículo do workspace" })
  @ApiResponse({ status: 200, description: "Lista de atribuições" })
  async listVehicleAssignments(@Req() req: Request, @UserId() userId: string, @Param("id") workspaceId: string) {
    const accessToken = this.extractAccessToken(req);
    const data = await this.workspacesService.listVehicleAssignments(accessToken, workspaceId);
    return { data };
  }

  @Put(":id/vehicles/:vehicleId/assign")
  @UseGuards(RolesGuard)
  @Roles("workspace_owner")
  @UsePipes(new ZodValidationPipe(assignVehicleDtoSchema))
  @ApiOperation({ summary: "Atribuir veículo próprio do owner a um membro" })
  @ApiResponse({ status: 200, description: "Veículo atribuído" })
  @ApiResponse({ status: 403, description: "Veículo não pertence ao owner" })
  async assignVehicle(
    @Req() req: Request,
    @UserId() userId: string,
    @Param("id") workspaceId: string,
    @Param("vehicleId") vehicleId: string,
    @Body() dto: AssignVehicleDto,
  ) {
    const accessToken = this.extractAccessToken(req);
    await this.workspacesService.assignVehicle(accessToken, userId, workspaceId, vehicleId, dto);
    return { data: { vehicleId, memberId: dto.memberId } };
  }

  @Delete(":id/vehicles/:vehicleId/assign")
  @UseGuards(RolesGuard)
  @Roles("workspace_owner")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remover atribuição de veículo" })
  @ApiResponse({ status: 204, description: "Atribuição removida" })
  async unassignVehicle(
    @Req() req: Request,
    @UserId() userId: string,
    @Param("id") workspaceId: string,
    @Param("vehicleId") vehicleId: string,
  ): Promise<void> {
    const accessToken = this.extractAccessToken(req);
    await this.workspacesService.unassignVehicle(accessToken, userId, workspaceId, vehicleId);
  }

  private extractAccessToken(req: Request): string {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      return header.slice("Bearer ".length);
    }
    const cookieToken = req.cookies?.navestory_access_token as string | undefined;
    if (cookieToken) {
      return cookieToken;
    }
    throw new UnauthorizedException("Token de acesso ausente");
  }
}
