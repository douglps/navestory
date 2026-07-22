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

  // valida C1
  describe("EC-11: hard-delete de usuário por admin não seta deleted_at (diferencia do soft-delete de 30 dias)", () => {
    it("deleteUser delega para auth.admin.deleteUser sem passar deleted_at — é hard delete via Supabase Auth Admin API (C1)", async () => {
      const adminSupabase = {
        deleteUser: jest.fn().mockResolvedValue(undefined),
      } as unknown as AdminSupabaseService;
      const auditService = { log: jest.fn() } as unknown as AuditService;
      const service = new AdminService(adminSupabase, auditService);

      await service.deleteUser("target-user", "admin-user");

      // deleteUser recebe apenas o userId — sem objeto de payload contendo deleted_at
      expect(adminSupabase.deleteUser).toHaveBeenCalledWith("target-user");
      expect(adminSupabase.deleteUser).not.toHaveBeenCalledWith(
        expect.objectContaining({ deleted_at: expect.anything() }),
      );
      // audit log changes também não deve conter deleted_at
      const logCall = (auditService.log as jest.Mock).mock.calls[0][0] as Record<string, unknown>;
      const changes = logCall.changes as Record<string, unknown>;
      expect(changes).not.toHaveProperty("deleted_at");
    });
  });
});
