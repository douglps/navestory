import * as Sentry from "@sentry/nestjs";
import type { AuditService } from "../../shared/audit/audit.service";
import type { SecurityContext } from "../../common/security/security-context";
import { AdminService } from "./admin.service";
import type { AdminSupabaseService } from "./admin-supabase.service";

jest.mock("@sentry/nestjs", () => ({ captureMessage: jest.fn() }));

describe("AdminService", () => {
  const securityContext: SecurityContext = { ip: "127.0.0.1", userAgent: "jest" };

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

    await service.deleteUser("target-user", "admin-user", securityContext);

    expect(adminSupabase.deleteUser).toHaveBeenCalledWith("target-user");
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "admin-user",
        action: "ADMIN_USER_DELETED",
        recordId: "target-user",
        changes: { admin_id: "admin-user", ip: "127.0.0.1", user_agent: "jest" },
      }),
    );
  });

  describe("updateUserRole (SPEC-20260731-008)", () => {
    it("promove usuário comum a admin e audita ADMIN_ROLE_GRANTED (RF-01, RF-05, CA-01)", async () => {
      const adminSupabase = {
        getUserById: jest.fn().mockResolvedValue({ id: "target-user", app_metadata: {} }),
        updateUserRole: jest.fn().mockResolvedValue(undefined),
      } as unknown as AdminSupabaseService;
      const auditService = { log: jest.fn() } as unknown as AuditService;
      const service = new AdminService(adminSupabase, auditService);

      const result = await service.updateUserRole(
        "target-user",
        "admin-user",
        "admin",
        securityContext,
      );

      expect(adminSupabase.updateUserRole).toHaveBeenCalledWith("target-user", "admin");
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "admin-user",
          action: "ADMIN_ROLE_GRANTED",
          tableName: "auth.users",
          recordId: "target-user",
          changes: {
            role_before: null,
            role_after: "admin",
            ip: "127.0.0.1",
            user_agent: "jest",
          },
        }),
      );
      expect(result).toEqual({ data: { id: "target-user", role: "admin" } });
    });

    it("revoga role de outro admin e audita ADMIN_ROLE_REVOKED (RF-01, RF-05, CA-02)", async () => {
      const adminSupabase = {
        getUserById: jest.fn().mockResolvedValue({ id: "target-user", app_metadata: { role: "admin" } }),
        updateUserRole: jest.fn().mockResolvedValue(undefined),
      } as unknown as AdminSupabaseService;
      const auditService = { log: jest.fn() } as unknown as AuditService;
      const service = new AdminService(adminSupabase, auditService);

      await service.updateUserRole("target-user", "admin-user", null, securityContext);

      expect(adminSupabase.updateUserRole).toHaveBeenCalledWith("target-user", null);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ADMIN_ROLE_REVOKED",
          changes: {
            role_before: "admin",
            role_after: null,
            ip: "127.0.0.1",
            user_agent: "jest",
          },
        }),
      );
    });

    // valida S14
    it("bloqueia auto-rebaixamento com 422 e não chama Supabase nem audit log (RF-04, CA-03)", async () => {
      const adminSupabase = {
        getUserById: jest.fn(),
        updateUserRole: jest.fn(),
      } as unknown as AdminSupabaseService;
      const auditService = { log: jest.fn() } as unknown as AuditService;
      const service = new AdminService(adminSupabase, auditService);

      await expect(
        service.updateUserRole("admin-user", "admin-user", null, securityContext),
      ).rejects.toThrow("Admin não pode revogar o próprio role");
      expect(adminSupabase.getUserById).not.toHaveBeenCalled();
      expect(adminSupabase.updateUserRole).not.toHaveBeenCalled();
      expect(auditService.log).not.toHaveBeenCalled();
    });

    // @spec SPEC-20260807-002 RF-B03 — valida S16
    it("emite Sentry.captureMessage warning ao bloquear auto-rebaixamento (RF-B03)", async () => {
      const adminSupabase = {
        getUserById: jest.fn(),
        updateUserRole: jest.fn(),
      } as unknown as AdminSupabaseService;
      const auditService = { log: jest.fn() } as unknown as AuditService;
      const service = new AdminService(adminSupabase, auditService);

      await expect(
        service.updateUserRole("admin-user", "admin-user", null, securityContext),
      ).rejects.toThrow();

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        "Tentativa de auto-rebaixamento de admin bloqueada (S14)",
        expect.objectContaining({
          level: "warning",
          tags: { security_event: true, scenario: "admin_self_demotion_attempt" },
          extra: expect.objectContaining({ adminUserId: "admin-user", targetUserId: "admin-user" }),
        }),
      );
    });

    it("admin promove a si mesmo para admin novamente sem 422 (auto-promoção permitida)", async () => {
      const adminSupabase = {
        getUserById: jest.fn().mockResolvedValue({ id: "admin-user", app_metadata: { role: "admin" } }),
        updateUserRole: jest.fn(),
      } as unknown as AdminSupabaseService;
      const auditService = { log: jest.fn() } as unknown as AuditService;
      const service = new AdminService(adminSupabase, auditService);

      await expect(
        service.updateUserRole("admin-user", "admin-user", "admin", securityContext),
      ).resolves.toEqual({ data: { id: "admin-user", role: "admin" } });
    });

    it("retorna 404 quando o usuário alvo não existe (RF-06, CA-05)", async () => {
      const adminSupabase = {
        getUserById: jest.fn().mockResolvedValue(null),
        updateUserRole: jest.fn(),
      } as unknown as AdminSupabaseService;
      const auditService = { log: jest.fn() } as unknown as AuditService;
      const service = new AdminService(adminSupabase, auditService);

      await expect(
        service.updateUserRole("missing-user", "admin-user", "admin", securityContext),
      ).rejects.toThrow("Usuário não encontrado");
      expect(adminSupabase.updateUserRole).not.toHaveBeenCalled();
    });

    it("é idempotente: role já é o mesmo antes e depois → sem update, sem audit log (RF-07, RNF-03)", async () => {
      const adminSupabase = {
        getUserById: jest.fn().mockResolvedValue({ id: "target-user", app_metadata: { role: "admin" } }),
        updateUserRole: jest.fn(),
      } as unknown as AdminSupabaseService;
      const auditService = { log: jest.fn() } as unknown as AuditService;
      const service = new AdminService(adminSupabase, auditService);

      await service.updateUserRole("target-user", "admin-user", "admin", securityContext);

      expect(adminSupabase.updateUserRole).not.toHaveBeenCalled();
      expect(auditService.log).not.toHaveBeenCalled();
    });
  });

  // valida C1
  describe("EC-11: hard-delete de usuário por admin não seta deleted_at (diferencia do soft-delete de 30 dias)", () => {
    it("deleteUser delega para auth.admin.deleteUser sem passar deleted_at — é hard delete via Supabase Auth Admin API (C1)", async () => {
      const adminSupabase = {
        deleteUser: jest.fn().mockResolvedValue(undefined),
      } as unknown as AdminSupabaseService;
      const auditService = { log: jest.fn() } as unknown as AuditService;
      const service = new AdminService(adminSupabase, auditService);

      await service.deleteUser("target-user", "admin-user", securityContext);

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
