import {
  Body,
  Controller,
  Get,
  Patch,
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
import { updatePreferencesDtoSchema, type UpdatePreferencesDto } from "./dto/update-preferences.dto";
import { PreferencesService } from "./preferences.service";

/**
 * @spec SPEC-20260612-003
 */
@ApiTags("preferences")
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller("preferences")
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Get()
  @ApiOperation({ summary: "Obter preferências do usuário (fallback default se ausente)" })
  @ApiResponse({ status: 200, description: "Preferências" })
  async findOne(@Req() req: Request, @UserId() userId: string) {
    const accessToken = this.extractAccessToken(req);
    const preferences = await this.preferencesService.findOne(accessToken, userId);
    return { data: preferences };
  }

  @Patch()
  @UsePipes(new ZodValidationPipe(updatePreferencesDtoSchema))
  @ApiOperation({ summary: "Atualizar preferências do usuário (upsert idempotente)" })
  @ApiResponse({ status: 200, description: "Preferências atualizadas" })
  async update(
    @Req() req: Request,
    @UserId() userId: string,
    @Body() dto: UpdatePreferencesDto,
  ) {
    const accessToken = this.extractAccessToken(req);
    const preferences = await this.preferencesService.upsert(accessToken, userId, dto);
    return { data: preferences };
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
