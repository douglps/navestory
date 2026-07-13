import { Injectable } from "@nestjs/common";
import { AuditService } from "../../shared/audit/audit.service";
import { AdminSupabaseService } from "./admin-supabase.service";
import type { ListAuditLogsQueryDto } from "./dto/list-audit-logs-query.dto";
import type { ListUsersQueryDto } from "./dto/list-users-query.dto";

/**
 * @spec SPEC-20260521-004 RF-06, RF-07, RF-08
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
}
