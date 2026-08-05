import type { ConfigService } from "@nestjs/config";
import { InternalServerErrorException } from "@nestjs/common";
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
      dashboard_kpi_ids: ["expenses_month", "urgent_maintenance", "cost_per_km", "next_maintenance"],
      timezone: null,
      // @spec SPEC-20260804-001 RF-01 — default seguro (R-PREF-01)
      spending_window_days: 7,
      default_context_type: null,
      default_context_id: null,
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

    expect(result).toEqual({
      auto_draft_enabled: true,
      vehicle_chip_fields: ["plate"],
      dashboard_kpi_ids: ["expenses_month", "urgent_maintenance", "cost_per_km", "next_maintenance"],
      timezone: null,
      spending_window_days: 7,
      default_context_type: null,
      default_context_id: null,
    });
  });

  it("findOne retorna spending_window_days persistido quando existe (SPEC-20260804-001 RF-01)", async () => {
    const builder: Record<string, unknown> = {};
    builder.select = jest.fn().mockReturnValue(builder);
    builder.eq = jest.fn().mockReturnValue(builder);
    builder.maybeSingle = jest.fn().mockResolvedValue({
      data: { auto_draft_enabled: false, vehicle_chip_fields: ["plate"], spending_window_days: 30 },
      error: null,
    });
    mockClient(builder);
    const service = createService();

    const result = await service.findOne("token", "u1");

    expect(result.spending_window_days).toBe(30);
  });

  it("upsert persiste spending_window_days (SPEC-20260804-001 RF-02)", async () => {
    const builder: Record<string, unknown> = {};
    builder.upsert = jest.fn().mockReturnValue(builder);
    builder.select = jest.fn().mockReturnValue(builder);
    builder.single = jest.fn().mockResolvedValue({
      data: { spending_window_days: 14 },
      error: null,
    });
    const client = mockClient(builder);
    const service = createService();

    const result = await service.upsert("token", "u1", { spending_window_days: 14 });

    expect(client.from).toHaveBeenCalledWith("user_preferences");
    expect(builder.upsert).toHaveBeenCalledWith(
      { user_id: "u1", spending_window_days: 14 },
      { onConflict: "user_id" },
    );
    expect(result).toEqual({ spending_window_days: 14 });
  });

  it("findOne retorna dashboard_kpi_ids persistido quando existe (RF-01)", async () => {
    const builder: Record<string, unknown> = {};
    builder.select = jest.fn().mockReturnValue(builder);
    builder.eq = jest.fn().mockReturnValue(builder);
    builder.maybeSingle = jest.fn().mockResolvedValue({
      data: { auto_draft_enabled: false, vehicle_chip_fields: ["plate"], dashboard_kpi_ids: ["fleet_health"] },
      error: null,
    });
    mockClient(builder);
    const service = createService();

    const result = await service.findOne("token", "u1");

    expect(result.dashboard_kpi_ids).toEqual(["fleet_health"]);
  });

  it("upsert persiste dashboard_kpi_ids (RF-01)", async () => {
    const builder: Record<string, unknown> = {};
    builder.upsert = jest.fn().mockReturnValue(builder);
    builder.select = jest.fn().mockReturnValue(builder);
    builder.single = jest.fn().mockResolvedValue({
      data: { dashboard_kpi_ids: ["fleet_health", "total_vehicles"] },
      error: null,
    });
    const client = mockClient(builder);
    const service = createService();

    const result = await service.upsert("token", "u1", {
      dashboard_kpi_ids: ["fleet_health", "total_vehicles"],
    });

    expect(client.from).toHaveBeenCalledWith("user_preferences");
    expect(builder.upsert).toHaveBeenCalledWith(
      { user_id: "u1", dashboard_kpi_ids: ["fleet_health", "total_vehicles"] },
      { onConflict: "user_id" },
    );
    expect(result).toEqual({ dashboard_kpi_ids: ["fleet_health", "total_vehicles"] });
  });

  it("findOne lança 500 em erro do Supabase", async () => {
    const builder: Record<string, unknown> = {};
    builder.select = jest.fn().mockReturnValue(builder);
    builder.eq = jest.fn().mockReturnValue(builder);
    builder.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
    mockClient(builder);
    const service = createService();

    await expect(service.findOne("token", "u1")).rejects.toBeInstanceOf(InternalServerErrorException);
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

  it("upsert lança 500 em erro do Supabase", async () => {
    const builder: Record<string, unknown> = {};
    builder.upsert = jest.fn().mockReturnValue(builder);
    builder.select = jest.fn().mockReturnValue(builder);
    builder.single = jest.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
    mockClient(builder);
    const service = createService();

    await expect(
      service.upsert("token", "u1", { auto_draft_enabled: true }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
