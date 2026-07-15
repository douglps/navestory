import { NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { ExpenseTemplatesService } from "./expense-templates.service";

jest.mock("../../shared/supabase/create-user-scoped-client", () => ({
  createUserScopedClient: jest.fn(),
}));

import { createUserScopedClient } from "../../shared/supabase/create-user-scoped-client";

describe("ExpenseTemplatesService", () => {
  const configService = {
    getOrThrow: jest.fn((key: string) => `stub-${key}`),
  } as unknown as ConfigService;

  function createService() {
    return new ExpenseTemplatesService(configService);
  }

  function mockClient(builder: Record<string, unknown>) {
    const client = { from: jest.fn().mockReturnValue(builder) };
    (createUserScopedClient as jest.Mock).mockReturnValue(client);
    return client;
  }

  it("findAll lista modelos ordenados por last_used_at desc (RF-01)", async () => {
    const builder: Record<string, unknown> = {};
    builder.select = jest.fn().mockReturnValue(builder);
    builder.eq = jest.fn().mockReturnValue(builder);
    builder.order = jest.fn().mockResolvedValue({
      data: [{ id: "t1", name: "Abastecimento Semanal" }],
      error: null,
    });
    mockClient(builder);
    const service = createService();

    const result = await service.findAll("token", "u1");

    expect(builder.order).toHaveBeenCalledWith("last_used_at", { ascending: false });
    expect(result).toHaveLength(1);
  });

  it("create lança 404 quando o veículo não pertence ao usuário", async () => {
    const builder: Record<string, unknown> = {};
    builder.select = jest.fn().mockReturnValue(builder);
    builder.eq = jest.fn().mockReturnValue(builder);
    builder.is = jest.fn().mockReturnValue(builder);
    builder.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    mockClient(builder);
    const service = createService();

    await expect(
      service.create("token", "u1", {
        name: "Modelo",
        vehicle_id: "v1",
        category: "fuel",
        amount: 100,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("create lança 422 quando usuário já tem 20 modelos (RF-07, CA-06)", async () => {
    const builder: Record<string, unknown> = {};
    builder.select = jest.fn().mockReturnValue(builder);
    builder.eq = jest
      .fn()
      .mockReturnValueOnce(builder)
      .mockReturnValueOnce(builder)
      .mockResolvedValueOnce({ count: 20, error: null });
    builder.is = jest.fn().mockReturnValue(builder);
    builder.maybeSingle = jest.fn().mockResolvedValue({ data: { id: "v1" }, error: null });
    mockClient(builder);
    const service = createService();

    await expect(
      service.create("token", "u1", {
        name: "Modelo",
        vehicle_id: "v1",
        category: "fuel",
        amount: 100,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it("create persiste o modelo válido (CA-05)", async () => {
    const builder: Record<string, unknown> = {};
    builder.select = jest.fn().mockReturnValue(builder);
    builder.eq = jest
      .fn()
      .mockReturnValueOnce(builder)
      .mockReturnValueOnce(builder)
      .mockResolvedValueOnce({ count: 2, error: null });
    builder.is = jest.fn().mockReturnValue(builder);
    builder.maybeSingle = jest.fn().mockResolvedValue({ data: { id: "v1" }, error: null });
    builder.insert = jest.fn().mockReturnValue(builder);
    builder.single = jest.fn().mockResolvedValue({
      data: { id: "t1", name: "Modelo", vehicle_id: "v1" },
      error: null,
    });
    mockClient(builder);
    const service = createService();

    const result = await service.create("token", "u1", {
      name: "Modelo",
      vehicle_id: "v1",
      category: "fuel",
      amount: 100,
    });

    expect(result).toEqual({ id: "t1", name: "Modelo", vehicle_id: "v1" });
  });

  it("touch atualiza last_used_at (RF-08)", async () => {
    const builder: Record<string, unknown> = {};
    builder.update = jest.fn().mockReturnValue(builder);
    builder.eq = jest.fn().mockReturnValue(builder);
    builder.select = jest.fn().mockReturnValue(builder);
    builder.maybeSingle = jest.fn().mockResolvedValue({
      data: { id: "t1", last_used_at: "2026-07-14T00:00:00Z" },
      error: null,
    });
    mockClient(builder);
    const service = createService();

    await service.touch("token", "u1", "t1");

    expect(builder.update).toHaveBeenCalledWith(
      expect.objectContaining({ last_used_at: expect.any(String) }),
    );
  });

  it("update lança 404 quando o modelo não pertence ao usuário", async () => {
    const builder: Record<string, unknown> = {};
    builder.update = jest.fn().mockReturnValue(builder);
    builder.eq = jest.fn().mockReturnValue(builder);
    builder.select = jest.fn().mockReturnValue(builder);
    builder.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    mockClient(builder);
    const service = createService();

    await expect(service.update("token", "other-user", "t1", { name: "X" })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("remove lança 404 quando o modelo não pertence ao usuário (CA-08)", async () => {
    const builder: Record<string, unknown> = {};
    builder.select = jest.fn().mockReturnValue(builder);
    builder.eq = jest.fn().mockReturnValue(builder);
    builder.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    mockClient(builder);
    const service = createService();

    await expect(service.remove("token", "other-user", "t1")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("remove executa delete quando o modelo pertence ao usuário (CA-08)", async () => {
    const builder: Record<string, unknown> = {};
    builder.select = jest.fn().mockReturnValue(builder);
    builder.eq = jest.fn().mockReturnValue(builder);
    builder.maybeSingle = jest.fn().mockResolvedValue({ data: { id: "t1" }, error: null });
    builder.delete = jest.fn().mockReturnValue(builder);
    mockClient(builder);
    const service = createService();

    await expect(service.remove("token", "u1", "t1")).resolves.toBeUndefined();
    expect(builder.delete).toHaveBeenCalled();
  });
});
