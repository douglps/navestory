import { Controller, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { UserId } from "../../common/decorators/user-id.decorator";
import { SoftDeletedUserGuard } from "../../common/guards/soft-deleted-user.guard";
import { UsersService } from "./users.service";

/**
 * @spec SPEC-20260719-002 RF-08, RF-10
 * Controller isolado (fora de `UsersController`) porque o endpoint de restore precisa do
 * `SoftDeletedUserGuard` no lugar do `SupabaseAuthGuard` — os guards do NestJS se acumulam
 * por controller, então o guard padrão (que rejeita contas soft-deleted) nunca poderia ser
 * substituído em nível de método dentro do mesmo controller.
 */
@ApiTags("users")
@ApiBearerAuth()
@UseGuards(SoftDeletedUserGuard)
@Controller("users/me")
export class AccountRestoreController {
  constructor(private readonly usersService: UsersService) {}

  @Post("restore")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Restaurar conta em soft-delete dentro da janela de 30 dias" })
  @ApiResponse({ status: 200, description: "Conta restaurada" })
  @ApiResponse({ status: 401, description: "JWT ausente ou inválido" })
  @ApiResponse({ status: 409, description: "Conta não estava marcada para exclusão" })
  async restore(@UserId() userId: string): Promise<{ message: string }> {
    await this.usersService.restoreAccount(userId);
    return { message: "Conta restaurada com sucesso." };
  }
}
