import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserId } from "../../common/decorators/user-id.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import { AdminService } from "./admin.service";
import { listAuditLogsQueryDtoSchema } from "./dto/list-audit-logs-query.dto";
import { listUsersQueryDtoSchema } from "./dto/list-users-query.dto";

/**
 * @spec SPEC-20260521-004 RF-06, RF-07, RF-08
 */
@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles("admin")
@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("users")
  @ApiOperation({ summary: "Listar usuários (admin)" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, description: "Lista paginada de usuários" })
  @ApiResponse({ status: 401, description: "JWT ausente ou inválido" })
  @ApiResponse({ status: 403, description: "Usuário autenticado não é admin" })
  async listUsers(@Query() query: unknown) {
    const parsed = listUsersQueryDtoSchema.parse(query);
    return this.adminService.listUsers(parsed);
  }

  @Get("audit-logs")
  @ApiOperation({ summary: "Listar audit logs (admin)" })
  @ApiQuery({ name: "user_id", required: false, type: String })
  @ApiQuery({ name: "from", required: false, type: String })
  @ApiQuery({ name: "to", required: false, type: String })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, description: "Lista paginada de audit logs" })
  @ApiResponse({ status: 403, description: "Usuário autenticado não é admin" })
  async listAuditLogs(@Query() query: unknown) {
    const parsed = listAuditLogsQueryDtoSchema.parse(query);
    return this.adminService.listAuditLogs(parsed);
  }

  @Delete("users/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Excluir conta de um usuário (LGPD, admin)" })
  @ApiResponse({ status: 204, description: "Conta excluída" })
  @ApiResponse({ status: 403, description: "Usuário autenticado não é admin" })
  @ApiResponse({ status: 404, description: "Usuário não encontrado" })
  async deleteUser(@Param("id") id: string, @UserId() adminUserId: string): Promise<void> {
    await this.adminService.deleteUser(id, adminUserId);
  }
}
