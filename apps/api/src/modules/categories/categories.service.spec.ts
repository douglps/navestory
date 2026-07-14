import { ConflictException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { CategoriesService } from "./categories.service";

jest.mock("../../shared/supabase/create-user-scoped-client", () => ({
  createUserScopedClient: jest.fn(),
}));

import { createUserScopedClient } from "../../shared/supabase/create-user-scoped-client";

describe("CategoriesService", () => {
  const configService = {
    getOrThrow: jest.fn((key: string) => `stub-${key}`),
  } as unknown as ConfigService;

  function createService() {
    return new CategoriesService(configService);
  }

  function mockClient(builder: Record<string, unknown>) {
    const client = { from: jest.fn().mockReturnValue(builder) };
    (createUserScopedClient as jest.Mock).mockReturnValue(client);
    return client;
  }

  it("findAll retorna default com 9 itens e custom do usuário (RF-01, CA-07)", async () => {
    const builder: Record<string, unknown> = {};
    builder.select = jest.fn().mockReturnValue(builder);
    builder.eq = jest.fn().mockReturnValue(builder);
    builder.order = jest.fn().mockResolvedValue({
      data: [{ id: "c1", user_id: "u1", value: "fuel_premium", label: "Gasolina Aditivada" }],
      error: null,
    });
    mockClient(builder);
    const service = createService();

    const result = await service.findAll("token", "u1");

    expect(result.default).toHaveLength(9);
    expect(result.custom).toHaveLength(1);
  });

  it("create lança 409 quando value coincide com categoria padrão (RF-04, CA-02)", async () => {
    const service = createService();

    await expect(
      service.create("token", "u1", { value: "fuel", label: "Qualquer" }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("create lança 422 quando usuário já tem 20 categorias (RF-05, CA-04)", async () => {
    const builder: Record<string, unknown> = {};
    builder.select = jest.fn().mockReturnValue(builder);
    builder.eq = jest.fn().mockResolvedValue({ count: 20, error: null });
    mockClient(builder);
    const service = createService();

    await expect(
      service.create("token", "u1", { value: "custom", label: "X" }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it("create lança 409 em violação de unicidade do banco (RF-03, CA-03)", async () => {
    const builder: Record<string, unknown> = {};
    builder.select = jest.fn().mockReturnValue(builder);
    builder.eq = jest.fn().mockResolvedValueOnce({ count: 0, error: null });
    builder.insert = jest.fn().mockReturnValue(builder);
    builder.single = jest.fn().mockResolvedValue({ data: null, error: { code: "23505" } });
    mockClient(builder);
    const service = createService();

    await expect(
      service.create("token", "u1", { value: "fuel_premium", label: "X" }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("create persiste categoria válida (CA-01)", async () => {
    const builder: Record<string, unknown> = {};
    builder.select = jest.fn().mockReturnValue(builder);
    builder.eq = jest.fn().mockResolvedValueOnce({ count: 0, error: null });
    builder.insert = jest.fn().mockReturnValue(builder);
    builder.single = jest.fn().mockResolvedValue({
      data: { id: "c1", user_id: "u1", value: "fuel_premium", label: "Gasolina Aditivada" },
      error: null,
    });
    mockClient(builder);
    const service = createService();

    const category = await service.create("token", "u1", {
      value: "fuel_premium",
      label: "Gasolina Aditivada",
    });

    expect(category).toEqual({
      id: "c1",
      user_id: "u1",
      value: "fuel_premium",
      label: "Gasolina Aditivada",
    });
  });

  it("remove lança 404 quando a categoria não pertence ao usuário (CA-06)", async () => {
    const builder: Record<string, unknown> = {};
    builder.select = jest.fn().mockReturnValue(builder);
    builder.eq = jest.fn().mockReturnValue(builder);
    builder.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    mockClient(builder);
    const service = createService();

    await expect(service.remove("token", "other-user", "c1")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("remove executa delete quando a categoria pertence ao usuário", async () => {
    const builder: Record<string, unknown> = {};
    builder.select = jest.fn().mockReturnValue(builder);
    builder.eq = jest.fn().mockReturnValue(builder);
    builder.maybeSingle = jest.fn().mockResolvedValue({ data: { id: "c1" }, error: null });
    builder.delete = jest.fn().mockReturnValue(builder);
    mockClient(builder);
    const service = createService();

    await expect(service.remove("token", "u1", "c1")).resolves.toBeUndefined();
    expect(builder.delete).toHaveBeenCalled();
  });
});
