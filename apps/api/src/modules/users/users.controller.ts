import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Req,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { Request } from "express";
import { UserId } from "../../common/decorators/user-id.decorator";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import type { JwtPayload } from "../../modules/auth/jwt.strategy";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import {
  deleteAccountDtoSchema,
  type DeleteAccountDto,
} from "./dto/delete-account.dto";
import {
  updateProfileDtoSchema,
  type UpdateProfileDto,
} from "./dto/update-profile.dto";
import { UsersService } from "./users.service";

/**
 * @spec SPEC-20260521-004
 */
@ApiTags("users")
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  @ApiOperation({ summary: "Obter perfil do usuário autenticado" })
  @ApiResponse({ status: 200, description: "Perfil do usuário" })
  @ApiResponse({ status: 401, description: "JWT ausente ou inválido" })
  @ApiResponse({ status: 404, description: "Perfil não encontrado" })
  async getMe(@Req() req: Request, @UserId() userId: string) {
    const accessToken = this.extractAccessToken(req);
    const profile = await this.usersService.getProfile(accessToken, userId);
    // @spec SPEC-20260719-001 RF-04 — e-mail vem do JWT (SupabaseAuthGuard já o populou em
    // request.user), não da tabela `profiles`, que não armazena e-mail.
    const jwtUser = (req as Request & { user?: JwtPayload }).user;
    return { data: { ...profile, email: jwtUser?.email ?? null } };
  }

  @Patch("me")
  @UsePipes(new ZodValidationPipe(updateProfileDtoSchema))
  @ApiOperation({ summary: "Atualizar perfil do usuário autenticado" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        name: { type: "string", minLength: 2 },
        preferences: { type: "object" },
      },
    },
  })
  @ApiResponse({ status: 200, description: "Perfil atualizado" })
  @ApiResponse({ status: 400, description: "Dados inválidos (schema Zod)" })
  async updateMe(
    @Req() req: Request,
    @UserId() userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    const accessToken = this.extractAccessToken(req);
    const profile = await this.usersService.updateProfile(
      accessToken,
      userId,
      dto,
    );
    return { data: profile };
  }

  /**
   * @spec SPEC-20260719-002 RF-01, RF-02
   */
  @Delete("me")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UsePipes(new ZodValidationPipe(deleteAccountDtoSchema))
  @ApiOperation({
    summary:
      "Excluir a própria conta — soft-delete com retenção de 30 dias (LGPD Art. 18)",
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["confirm"],
      properties: { confirm: { type: "boolean", example: true } },
    },
  })
  @ApiResponse({ status: 204, description: "Conta excluída" })
  @ApiResponse({ status: 400, description: "confirm !== true" })
  async deleteMe(
    @UserId() userId: string,
    @Body() _dto: DeleteAccountDto,
  ): Promise<void> {
    await this.usersService.deleteAccount(userId);
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
