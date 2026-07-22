import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { AuditService } from "../../shared/audit/audit.service";
import { VehiclesService } from "./vehicles.service";

jest.mock("../../shared/supabase/create-user-scoped-client", () => ({
  createUserScopedClient: jest.fn(),
}));

import { createUserScopedClient } from "../../shared/supabase/create-user-scoped-client";

describe("VehiclesService", () => {
  const configService = {
    getOrThrow: jest.fn((key: string) => `stub-${key}`),
  } as unknown as ConfigService;
  const supabaseAdmin = {} as never;

  function mockClient(result: { data: unknown; error: unknown }) {
    const builder: Record<string, unknown> = {};
    builder.select = jest.fn().mockReturnValue(builder);
    builder.insert = jest.fn().mockReturnValue(builder);
    builder.update = jest.fn().mockReturnValue(builder);
    builder.eq = jest.fn().mockReturnValue(builder);
    builder.is = jest.fn().mockReturnValue(builder);
    builder.order = jest.fn().mockReturnValue(builder);
    builder.limit = jest.fn().mockResolvedValue(result);
    builder.single = jest.fn().mockResolvedValue(result);
    builder.maybeSingle = jest.fn().mockResolvedValue(result);
    const client = { from: jest.fn().mockReturnValue(builder) };
    (createUserScopedClient as jest.Mock).mockReturnValue(client);
    return { client, builder };
  }

  function createService(auditLog = jest.fn()) {
    const auditService = { log: auditLog } as unknown as AuditService;
    return new VehiclesService(supabaseAdmin, configService, auditService);
  }

  it("create normaliza a placa e persiste o veículo (RF-01, RF-02, CA-01)", async () => {
    const { client } = mockClient({
      data: { id: "v1", user_id: "u1", plate: "ABC1234" },
      error: null,
    });
    const service = createService();

    const vehicle = await service.create("token", "u1", {
      plate: "abc-1234",
      make: "Fiat",
      model: "Uno",
      year: 2020,
      vehicle_type: "carro",
    } as never);

    expect(vehicle).toEqual({ id: "v1", user_id: "u1", plate: "ABC1234" });
    const insertCall = (client.from("vehicles").insert as jest.Mock).mock.calls[0][0];
    expect(insertCall.plate).toBe("ABC1234");
  });

  it("create lança 400 quando a placa é inválida (CA-02)", async () => {
    mockClient({ data: null, error: null });
    const service = createService();

    await expect(
      service.create("token", "u1", {
        plate: "AB1234",
        make: "Fiat",
        model: "Uno",
        year: 2020,
        vehicle_type: "carro",
      } as never),
    ).rejects.toThrow();
  });

  it("findAll retorna apenas veículos ativos do usuário (RF-03, RF-16, CA-04)", async () => {
    mockClient({ data: [{ id: "v1" }, { id: "v2" }], error: null });
    const service = createService();

    const vehicles = await service.findAll("token", "u1");

    expect(vehicles).toHaveLength(2);
  });

  it("findAll aplica limit(100) na query (SPEC-20260603-001 RF-18)", async () => {
    const { builder } = mockClient({ data: [], error: null });
    const service = createService();

    await service.findAll("token", "u1");

    expect(builder.limit).toHaveBeenCalledWith(100);
  });

  it("findOne lança 404 quando o veículo não existe ou não pertence ao usuário (CA-08)", async () => {
    mockClient({ data: null, error: null });
    const service = createService();

    await expect(service.findOne("token", "u1", "v1")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("findOne retorna o veículo quando encontrado (RF-04)", async () => {
    mockClient({ data: { id: "v1" }, error: null });
    const service = createService();

    const vehicle = await service.findOne("token", "u1", "v1");

    expect(vehicle).toEqual({ id: "v1" });
  });

  it("update atualiza apenas os campos enviados (RF-05, CA-07)", async () => {
    const { client } = mockClient({ data: { id: "v1", color: "Azul" }, error: null });
    const service = createService();

    await service.update("token", "u1", "v1", { color: "Azul" } as never);

    const updateCall = (client.from("vehicles").update as jest.Mock).mock.calls[0][0];
    expect(updateCall).toEqual({ color: "Azul" });
  });

  it("update normaliza a placa quando enviada", async () => {
    const { client } = mockClient({ data: { id: "v1", plate: "ABC1D23" }, error: null });
    const service = createService();

    await service.update("token", "u1", "v1", { plate: "abc-1d23" } as never);

    const updateCall = (client.from("vehicles").update as jest.Mock).mock.calls[0][0];
    expect(updateCall.plate).toBe("ABC1D23");
  });

  it("update lança 404 quando o veículo não pertence ao usuário", async () => {
    mockClient({ data: null, error: null });
    const service = createService();

    await expect(
      service.update("token", "other-user", "v1", { color: "Azul" } as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("remove lança 404 quando o veículo não existe (CA-06)", async () => {
    mockClient({ data: null, error: null });
    const service = createService();

    await expect(service.remove("token", "u1", "v1")).rejects.toBeInstanceOf(NotFoundException);
  });

  // valida R-VEH-02
  it("EC-06: update com placa em formato inválido lança BadRequestException (R-VEH-02)", async () => {
    mockClient({ data: null, error: null });
    const service = createService();

    await expect(
      service.update("token", "u1", "v1", { plate: "AB1234" } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  // valida R-VEH-01
  describe("EC-05: cascade de soft-delete aplica o mesmo deleted_at em vehicles, expenses e maintenances", () => {
    it("todos os três updates recebem exatamente o mesmo valor de deleted_at", async () => {
      const builder: Record<string, unknown> = {};
      builder.select = jest.fn().mockReturnValue(builder);
      builder.update = jest.fn().mockReturnValue(builder);
      builder.eq = jest.fn().mockReturnValue(builder);
      builder.is = jest.fn().mockReturnValue(builder);
      builder.maybeSingle = jest.fn().mockResolvedValue({ data: { id: "v1" }, error: null });
      (builder.update as jest.Mock).mockImplementation(() => ({
        ...builder,
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
          is: jest.fn().mockResolvedValue({ error: null }),
        }),
      }));
      const client = { from: jest.fn().mockReturnValue(builder) };
      (createUserScopedClient as jest.Mock).mockReturnValue(client);
      const service = createService();

      await service.remove("token", "u1", "v1");

      // Deve haver 3 chamadas a update: vehicles, expenses, maintenances
      const updateCalls = (builder.update as jest.Mock).mock.calls;
      expect(updateCalls).toHaveLength(3);

      // Todos devem carregar o mesmo deleted_at (mesma variável, não só "algum valor definido")
      const deletedAtValues = updateCalls.map(
        (args) => (args[0] as Record<string, unknown>).deleted_at,
      );
      expect(deletedAtValues[0]).toBeDefined();
      expect(deletedAtValues[1]).toBe(deletedAtValues[0]);
      expect(deletedAtValues[2]).toBe(deletedAtValues[0]);
    });
  });

  it("remove soft-deleta veículo, despesas e manutenções com o mesmo timestamp (RF-06, R-VEH-01, CA-05)", async () => {
    const builder: Record<string, unknown> = {};
    builder.select = jest.fn().mockReturnValue(builder);
    builder.update = jest.fn().mockReturnValue(builder);
    builder.eq = jest.fn().mockReturnValue(builder);
    builder.is = jest.fn().mockReturnValue(builder);
    builder.maybeSingle = jest.fn().mockResolvedValue({ data: { id: "v1" }, error: null });
    (builder.update as jest.Mock).mockImplementation(() => ({
      ...builder,
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
        is: jest.fn().mockResolvedValue({ error: null }),
      }),
    }));
    const client = { from: jest.fn().mockReturnValue(builder) };
    (createUserScopedClient as jest.Mock).mockReturnValue(client);
    const auditLog = jest.fn();
    const service = createService(auditLog);

    await service.remove("token", "u1", "v1");

    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "VEHICLE_DELETED", recordId: "v1" }),
    );
  });
});
