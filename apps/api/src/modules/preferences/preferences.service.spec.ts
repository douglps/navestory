import type { ConfigService } from "@nestjs/config";
import { NotFoundException } from "@nestjs/common";
import { PreferencesService } from "./preferences.service";

jest.mock("../../shared/supabase/create-user-scoped-client", () => ({
  createUserScopedClient: jest.fn(),
}));

import { createUserScopedClient } from "../../shared/supabase/create-user-scoped-client";

describe("PreferencesService", () => {
  const configService = {
    getOrThrow: jest.fn((key: string) => `stub-${key}`),
  } as unknown as ConfigService;

  function createService() {
    return new PreferencesService(configService);
  }

  function mockClient(builder: Record<string, unknown>) {
    const client = { from: jest.fn().mockReturnValue(builder) };
    (createUserScopedClient as jest.Mock).mockReturnValue(client);
    return client;
  }

  it("findOne retorna default quando não há linha (R-PREF-01, R-DISP-03)", async () => {
    const builder: Record<string, unknown> = {};
    builder.select = jest.fn().mockReturnValue(builder);
    builder.eq = jest.fn().mockReturnValue(builder);
    builder.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    mockClient(builder);
    const service = createService();

    const result = await service.findOne("token", "u1");

    expect(result).toEqual({
      auto_draft_enabled: false,
      vehicle_chip_fields: ["make", "plate", "model"],
    });
  });

  it("findOne retorna o valor persistido quando existe linha", async () => {
    const builder: Record<string, unknown> = {};
    builder.select = jest.fn().mockReturnValue(builder);
    builder.eq = jest.fn().mockReturnValue(builder);
    builder.maybeSingle = jest.fn().mockResolvedValue({
      data: { auto_draft_enabled: true, vehicle_chip_fields: ["plate"] },
      error: null,
    });
    mockClient(builder);
    const service = createService();

    const result = await service.findOne("token", "u1");

    expect(result).toEqual({ auto_draft_enabled: true, vehicle_chip_fields: ["plate"] });
  });

  it("findOne lança 404 em erro do Supabase", async () => {
    const builder: Record<string, unknown> = {};
    builder.select = jest.fn().mockReturnValue(builder);
    builder.eq = jest.fn().mockReturnValue(builder);
    builder.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
    mockClient(builder);
    const service = createService();

    await expect(service.findOne("token", "u1")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("upsert persiste e é idempotente por user_id (RF-01.3, R-PREF-01)", async () => {
    const builder: Record<string, unknown> = {};
    builder.upsert = jest.fn().mockReturnValue(builder);
    builder.select = jest.fn().mockReturnValue(builder);
    builder.single = jest.fn().mockResolvedValue({ data: { auto_draft_enabled: true }, error: null });
    const client = mockClient(builder);
    const service = createService();

    const result = await service.upsert("token", "u1", { auto_draft_enabled: true });

    expect(client.from).toHaveBeenCalledWith("user_preferences");
    expect(builder.upsert).toHaveBeenCalledWith(
      { user_id: "u1", auto_draft_enabled: true },
      { onConflict: "user_id" },
    );
    expect(result).toEqual({ auto_draft_enabled: true });
  });

  it("upsert persiste apenas vehicle_chip_fields sem exigir auto_draft_enabled (RF-06)", async () => {
    const builder: Record<string, unknown> = {};
    builder.upsert = jest.fn().mockReturnValue(builder);
    builder.select = jest.fn().mockReturnValue(builder);
    builder.single = jest.fn().mockResolvedValue({
      data: { auto_draft_enabled: false, vehicle_chip_fields: ["plate"] },
      error: null,
    });
    const client = mockClient(builder);
    const service = createService();

    const result = await service.upsert("token", "u1", { vehicle_chip_fields: ["plate"] });

    expect(client.from).toHaveBeenCalledWith("user_preferences");
    expect(builder.upsert).toHaveBeenCalledWith(
      { user_id: "u1", vehicle_chip_fields: ["plate"] },
      { onConflict: "user_id" },
    );
    expect(result).toEqual({ auto_draft_enabled: false, vehicle_chip_fields: ["plate"] });
  });

  it("upsert lança 404 em erro do Supabase", async () => {
    const builder: Record<string, unknown> = {};
    builder.upsert = jest.fn().mockReturnValue(builder);
    builder.select = jest.fn().mockReturnValue(builder);
    builder.single = jest.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
    mockClient(builder);
    const service = createService();

    await expect(
      service.upsert("token", "u1", { auto_draft_enabled: true }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
