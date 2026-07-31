import { Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { AuditService } from "../../shared/audit/audit.service";
import { AdminSupabaseService } from "./admin-supabase.service";
import type { ListAuditLogsQueryDto } from "./dto/list-audit-logs-query.dto";
import type { ListUsersQueryDto } from "./dto/list-users-query.dto";

/**
 * @spec SPEC-20260521-004 RF-06, RF-07, RF-08
 * @spec SPEC-20260731-008 RF-01, RF-04, RF-05, RF-06, RF-07
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly adminSupabase: AdminSupabaseService,
    private readonly auditService: AuditService,
  ) {}

  async listUsers(query: ListUsersQueryDto) {
    const result = await this.adminSupabase.listUsers(query.page, query.limit);
    return {
      data: result.users,
      meta: { total: result.total, page: query.page, limit: query.limit },
    };
  }

  async listAuditLogs(query: ListAuditLogsQueryDto) {
    const result = await this.adminSupabase.listAuditLogs({
      userId: query.user_id,
      from: query.from,
      to: query.to,
      page: query.page,
      limit: query.limit,
    });
    return {
      data: result.data,
      meta: { total: result.total, page: query.page, limit: query.limit },
    };
  }

  /**
   * @spec SPEC-20260521-004 RF-08 — exclusão de conta de terceiro por admin (LGPD).
   */
  async deleteUser(targetUserId: string, adminUserId: string): Promise<void> {
    await this.adminSupabase.deleteUser(targetUserId);

    void this.auditService.log({
      userId: adminUserId,
      action: "ADMIN_USER_DELETED",
      tableName: "profiles",
      recordId: targetUserId,
      changes: { admin_id: adminUserId },
    });
  }

  /**
   * @spec SPEC-20260731-008 RF-01 a RF-07 — promoção/rebaixamento de role de admin.
   */
  async updateUserRole(targetUserId: string, adminUserId: string, role: "admin" | null) {
    // valida S14 — bloqueia auto-rebaixamento antes de qualquer chamada ao Supabase
    if (targetUserId === adminUserId && role === null) {
      throw new UnprocessableEntityException("Admin não pode revogar o próprio role");
    }

    const targetUser = await this.adminSupabase.getUserById(targetUserId);
    if (!targetUser) {
      throw new NotFoundException("Usuário não encontrado");
    }

    const roleBefore = targetUser.app_metadata?.role ?? null;
    if (roleBefore === role) {
      return { data: { id: targetUserId, role } };
    }

    await this.adminSupabase.updateUserRole(targetUserId, role);

    void this.auditService.log({
      userId: adminUserId,
      action: role === "admin" ? "ADMIN_ROLE_GRANTED" : "ADMIN_ROLE_REVOKED",
      tableName: "auth.users",
      recordId: targetUserId,
      changes: { role_before: roleBefore, role_after: role },
    });

    return { data: { id: targetUserId, role } };
  }
}
