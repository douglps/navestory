import type { AuditService } from "../../shared/audit/audit.service";
import { AdminService } from "./admin.service";
import type { AdminSupabaseService } from "./admin-supabase.service";

describe("AdminService", () => {
  it("listUsers delega para AdminSupabaseService e monta meta de paginação (RF-06)", async () => {
    const adminSupabase = {
      listUsers: jest.fn().mockResolvedValue({ users: [{ id: "u1" }], total: 1 }),
    } as unknown as AdminSupabaseService;
    const auditService = { log: jest.fn() } as unknown as AuditService;
    const service = new AdminService(adminSupabase, auditService);

    const result = await service.listUsers({ page: 1, limit: 20 });

    expect(result.data).toEqual([{ id: "u1" }]);
    expect(result.meta).toEqual({ total: 1, page: 1, limit: 20 });
  });

  it("listAuditLogs delega para AdminSupabaseService com os filtros (RF-07)", async () => {
    const adminSupabase = {
      listAuditLogs: jest.fn().mockResolvedValue({ data: [{ id: "log-1" }], total: 1 }),
    } as unknown as AdminSupabaseService;
    const auditService = { log: jest.fn() } as unknown as AuditService;
    const service = new AdminService(adminSupabase, auditService);

    const result = await service.listAuditLogs({ page: 1, limit: 20, user_id: "u1" });

    expect(adminSupabase.listAuditLogs).toHaveBeenCalledWith({
      userId: "u1",
      from: undefined,
      to: undefined,
      page: 1,
      limit: 20,
    });
    expect(result).toEqual({ data: [{ id: "log-1" }], meta: { total: 1, page: 1, limit: 20 } });
  });

  it("deleteUser exclui e audita ADMIN_USER_DELETED com admin_id (RF-08)", async () => {
    const adminSupabase = {
      deleteUser: jest.fn().mockResolvedValue(undefined),
    } as unknown as AdminSupabaseService;
    const auditService = { log: jest.fn() } as unknown as AuditService;
    const service = new AdminService(adminSupabase, auditService);

    await service.deleteUser("target-user", "admin-user");

    expect(adminSupabase.deleteUser).toHaveBeenCalledWith("target-user");
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "admin-user",
        action: "ADMIN_USER_DELETED",
        recordId: "target-user",
        changes: { admin_id: "admin-user" },
      }),
    );
  });
});
