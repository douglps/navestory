import { Body, Controller, Get, Param, Patch, Query, Req, UnauthorizedException, UseGuards, UsePipes } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { complianceQuerySchema } from "@navestory/validators";
import type { Request } from "express";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserId } from "../../common/decorators/user-id.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { updateDriverSettingsDtoSchema, type UpdateDriverSettingsDto } from "./dto/update-driver-settings.dto";
import { updateMemberProfileDtoSchema, type UpdateMemberProfileDto } from "./dto/update-member-profile.dto";
import { FleetSettingsService } from "./fleet-settings.service";

/**
 * @spec specs/fleet-admin/SPEC-20260804-003-fleet-settings.md
 */
@ApiTags("fleet-settings")
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller("workspaces/:id")
export class FleetSettingsController {
  constructor(private readonly fleetSettingsService: FleetSettingsService) {}

  @Get("driver-settings")
  @UseGuards(RolesGuard)
  @Roles("workspace_owner", "workspace_member")
  @ApiOperation({ summary: "Campos obrigatórios de motorista do workspace (RF-01, RF-02, RF-04 — leitura também liberada ao member)" })
  async getDriverSettings(@Req() req: Request, @Param("id") workspaceId: string) {
    const accessToken = this.extractAccessToken(req);
    const data = await this.fleetSettingsService.getDriverSettings(accessToken, workspaceId);
    return { data };
  }

  @Patch("driver-settings")
  @UseGuards(RolesGuard)
  @Roles("workspace_owner")
  @UsePipes(new ZodValidationPipe(updateDriverSettingsDtoSchema))
  @ApiOperation({ summary: "Atualizar campos obrigatórios de motorista (RF-02, RF-14)" })
  async updateDriverSettings(
    @Req() req: Request,
    @UserId() userId: string,
    @Param("id") workspaceId: string,
    @Body() dto: UpdateDriverSettingsDto,
  ) {
    const accessToken = this.extractAccessToken(req);
    const data = await this.fleetSettingsService.updateDriverSettings(accessToken, userId, workspaceId, dto);
    return { data };
  }

  @Get("compliance")
  @UseGuards(RolesGuard)
  @Roles("workspace_owner")
  @ApiOperation({ summary: "Painel de conformidade consolidado (RF-11, RF-12)" })
  async getCompliance(
    @Req() req: Request,
    @UserId() userId: string,
    @Param("id") workspaceId: string,
    @Query() query: unknown,
  ) {
    const accessToken = this.extractAccessToken(req);
    const parsed = complianceQuerySchema.parse(query);
    const data = await this.fleetSettingsService.getCompliance(accessToken, userId, workspaceId, parsed);
    return { data };
  }

  @Get("members/me/profile")
  @UseGuards(RolesGuard)
  @Roles("workspace_member")
  @ApiOperation({ summary: "Perfil de motorista do próprio member autenticado (RF-04)" })
  async getMyProfile(@Req() req: Request) {
    const accessToken = this.extractAccessToken(req);
    const data = await this.fleetSettingsService.getMyProfile(accessToken);
    return { data };
  }

  @Patch("members/me/profile")
  @UseGuards(RolesGuard)
  @Roles("workspace_member")
  @UsePipes(new ZodValidationPipe(updateMemberProfileDtoSchema))
  @ApiOperation({ summary: "Preencher/atualizar o próprio perfil de motorista (RF-04, RF-06)" })
  async updateMyProfile(@Req() req: Request, @Body() dto: UpdateMemberProfileDto) {
    const accessToken = this.extractAccessToken(req);
    const data = await this.fleetSettingsService.updateMyProfile(accessToken, dto);
    return { data };
  }

  @Get("members/:memberId/profile")
  @UseGuards(RolesGuard)
  @Roles("workspace_owner")
  @ApiOperation({ summary: "Detalhe de perfil de um motorista específico (RF-13)" })
  async getMemberProfile(@Req() req: Request, @Param("memberId") memberId: string) {
    const accessToken = this.extractAccessToken(req);
    const data = await this.fleetSettingsService.getMemberProfile(accessToken, memberId);
    return { data };
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
