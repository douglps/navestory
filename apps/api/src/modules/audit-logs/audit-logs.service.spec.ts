import { BadRequestException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { AuditLogsService } from "./audit-logs.service";

jest.mock("../../shared/supabase/create-user-scoped-client", () => ({
  createUserScopedClient: jest.fn(),
}));

import { createUserScopedClient } from "../../shared/supabase/create-user-scoped-client";

describe("AuditLogsService", () => {
  const configService = {
    getOrThrow: jest.fn((key: string) => `stub-${key}`),
  } as unknown as ConfigService;

  function createService() {
    return new AuditLogsService(configService);
  }

  function mockClient(builder: Record<string, unknown>) {
    const client = { from: jest.fn().mockReturnValue(builder) };
    (createUserScopedClient as jest.Mock).mockReturnValue(client);
    return client;
  }

  function buildQueryBuilder(result: { data: unknown; error: unknown }) {
    const builder: Record<string, unknown> = {};
    builder.select = jest.fn().mockReturnValue(builder);
    builder.eq = jest.fn().mockReturnValue(builder);
    builder.order = jest.fn().mockReturnValue(builder);
    builder.limit = jest.fn().mockResolvedValue(result);
    return builder;
  }

  it("findRecent consulta audit_logs filtrado por user_id, ordenado desc, limitado a 100 (RF-09, RF-10)", async () => {
    const builder = buildQueryBuilder({
      data: [
        { id: "1", action: "LOGIN", table_name: "auth", record_id: "u1", changes: {}, created_at: "2026-07-18T00:00:00Z" },
      ],
      error: null,
    });
    const client = mockClient(builder);
    const service = createService();

    const rows = await service.findRecent("token", "u1");

    expect(client.from).toHaveBeenCalledWith("audit_logs");
    expect(builder.eq).toHaveBeenCalledWith("user_id", "u1");
    expect(builder.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(builder.limit).toHaveBeenCalledWith(100);
    expect(rows).toHaveLength(1);
  });

  it("remove campos sensíveis de changes antes de retornar (RF-06, R-MON-02)", async () => {
    const builder = buildQueryBuilder({
      data: [
        {
          id: "1",
          action: "Atualização de Veículo",
          table_name: "vehicles",
          record_id: "v1",
          changes: { user_id: "u1", deleted_at: null, photo_url: "x", photo_thumbnail_url: "y", plate: "ABC1234" },
          created_at: "2026-07-18T00:00:00Z",
        },
      ],
      error: null,
    });
    mockClient(builder);
    const service = createService();

    const rows = await service.findRecent("token", "u1");

    expect(rows[0]?.changes).toEqual({ plate: "ABC1234" });
  });

  it("EC-08: remove campos de token de changes antes de retornar (R-MON-02)", async () => {
    const builder = buildQueryBuilder({
      data: [
        {
          id: "1",
          action: "Login",
          table_name: "auth",
          record_id: "u1",
          changes: { access_token: "abc.def.ghi", token: "refresh-xyz", plate: "ABC1234" },
          created_at: "2026-07-18T00:00:00Z",
        },
      ],
      error: null,
    });
    mockClient(builder);
    const service = createService();

    const rows = await service.findRecent("token", "u1");

    expect(rows[0]?.changes).toEqual({ plate: "ABC1234" });
  });

  it("lança BadRequestException quando a query falha", async () => {
    const builder = buildQueryBuilder({ data: null, error: { message: "boom" } });
    mockClient(builder);
    const service = createService();

    await expect(service.findRecent("token", "u1")).rejects.toBeInstanceOf(BadRequestException);
  });
});
