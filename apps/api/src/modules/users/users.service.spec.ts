import { ConflictException, NotFoundException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { AuditService } from "../../shared/audit/audit.service";
import { UsersService } from "./users.service";

jest.mock("../../shared/supabase/create-user-scoped-client", () => ({
  createUserScopedClient: jest.fn(),
}));

import { createUserScopedClient } from "../../shared/supabase/create-user-scoped-client";

describe("UsersService", () => {
  const configService = {
    getOrThrow: jest.fn((key: string) => `stub-${key}`),
  } as unknown as ConfigService;

  function mockUserScopedClient(result: { data: unknown; error: unknown }) {
    const builder: Record<string, unknown> = {};
    builder.select = jest.fn().mockReturnValue(builder);
    builder.eq = jest.fn().mockReturnValue(builder);
    builder.maybeSingle = jest.fn().mockResolvedValue(result);
    builder.update = jest.fn().mockReturnValue(builder);
    builder.single = jest.fn().mockResolvedValue(result);
    const client = { from: jest.fn().mockReturnValue(builder) };
    (createUserScopedClient as jest.Mock).mockReturnValue(client);
    return client;
  }

  it("getProfile retorna o perfil do usuário autenticado", async () => {
    mockUserScopedClient({ data: { id: "u1", name: "Ana" }, error: null });
    const auditService = { log: jest.fn() } as unknown as AuditService;
    const supabaseAdmin = { auth: { admin: { deleteUser: jest.fn() } } };
    const service = new UsersService(supabaseAdmin as never, configService, auditService);

    const profile = await service.getProfile("token", "u1");

    expect(profile).toEqual({ id: "u1", name: "Ana" });
  });

  it("getProfile lança 404 quando o perfil não existe (RLS bloqueou ou não encontrado)", async () => {
    mockUserScopedClient({ data: null, error: null });
    const auditService = { log: jest.fn() } as unknown as AuditService;
    const supabaseAdmin = { auth: { admin: { deleteUser: jest.fn() } } };
    const service = new UsersService(supabaseAdmin as never, configService, auditService);

    await expect(service.getProfile("token", "other-user")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("updateProfile atualiza e retorna o perfil", async () => {
    mockUserScopedClient({ data: { id: "u1", name: "Ana Atualizada" }, error: null });
    const auditService = { log: jest.fn() } as unknown as AuditService;
    const supabaseAdmin = { auth: { admin: { deleteUser: jest.fn() } } };
    const service = new UsersService(supabaseAdmin as never, configService, auditService);

    const profile = await service.updateProfile("token", "u1", { name: "Ana Atualizada" });

    expect(profile).toEqual({ id: "u1", name: "Ana Atualizada" });
  });

  it("updateProfile lança 404 quando a atualização falha (RLS bloqueou ou não encontrado)", async () => {
    mockUserScopedClient({ data: null, error: null });
    const auditService = { log: jest.fn() } as unknown as AuditService;
    const supabaseAdmin = { auth: { admin: { deleteUser: jest.fn() } } };
    const service = new UsersService(supabaseAdmin as never, configService, auditService);

    await expect(
      service.updateProfile("token", "other-user", { name: "X" }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  function mockAdminProfilesBuilder(result: { data: unknown; error: unknown }) {
    const builder: Record<string, unknown> = {};
    builder.update = jest.fn().mockReturnValue(builder);
    builder.eq = jest.fn().mockReturnValue(builder);
    builder.is = jest.fn().mockReturnValue(builder);
    builder.not = jest.fn().mockReturnValue(builder);
    builder.select = jest.fn().mockReturnValue(builder);
    builder.maybeSingle = jest.fn().mockResolvedValue(result);
    const supabaseAdmin = { from: jest.fn().mockReturnValue(builder) };
    return { supabaseAdmin, builder };
  }

  it("deleteAccount marca profiles.deleted_at e audita ACCOUNT_DELETION_REQUESTED (RF-01)", async () => {
    const auditService = { log: jest.fn() } as unknown as AuditService;
    const { supabaseAdmin, builder } = mockAdminProfilesBuilder({ data: { id: "u1" }, error: null });
    const service = new UsersService(supabaseAdmin as never, configService, auditService);

    await service.deleteAccount("u1");

    expect(builder.update).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.any(String) }),
    );
    expect(builder.eq).toHaveBeenCalledWith("id", "u1");
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ACCOUNT_DELETION_REQUESTED", recordId: "u1" }),
    );
  });

  it("deleteAccount lança 404 quando a conta não existe ou já está soft-deleted (RF-02)", async () => {
    const auditService = { log: jest.fn() } as unknown as AuditService;
    const { supabaseAdmin } = mockAdminProfilesBuilder({ data: null, error: null });
    const service = new UsersService(supabaseAdmin as never, configService, auditService);

    await expect(service.deleteAccount("u1")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("restoreAccount zera profiles.deleted_at e audita ACCOUNT_RESTORED (RF-08)", async () => {
    const auditService = { log: jest.fn() } as unknown as AuditService;
    const { supabaseAdmin, builder } = mockAdminProfilesBuilder({ data: { id: "u1" }, error: null });
    const service = new UsersService(supabaseAdmin as never, configService, auditService);

    await service.restoreAccount("u1");

    expect(builder.update).toHaveBeenCalledWith({ deleted_at: null });
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ACCOUNT_RESTORED", recordId: "u1" }),
    );
  });

  it("restoreAccount lança 409 quando a conta não estava marcada para exclusão", async () => {
    const auditService = { log: jest.fn() } as unknown as AuditService;
    const { supabaseAdmin } = mockAdminProfilesBuilder({ data: null, error: null });
    const service = new UsersService(supabaseAdmin as never, configService, auditService);

    await expect(service.restoreAccount("u1")).rejects.toBeInstanceOf(ConflictException);
  });

  it("restoreAccount lança 404 quando a query falha", async () => {
    const auditService = { log: jest.fn() } as unknown as AuditService;
    const { supabaseAdmin } = mockAdminProfilesBuilder({ data: null, error: new Error("falhou") });
    const service = new UsersService(supabaseAdmin as never, configService, auditService);

    await expect(service.restoreAccount("u1")).rejects.toBeInstanceOf(NotFoundException);
  });
});
