import { UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { PreferencesController } from "./preferences.controller";
import type { PreferencesService } from "./preferences.service";

describe("PreferencesController", () => {
  function createController(overrides?: Partial<PreferencesService>) {
    const preferencesService = {
      findOne: jest.fn().mockResolvedValue({ auto_draft_enabled: false }),
      upsert: jest.fn().mockResolvedValue({ auto_draft_enabled: true }),
      ...overrides,
    } as unknown as PreferencesService;
    return { controller: new PreferencesController(preferencesService), preferencesService };
  }

  const req = { headers: { authorization: "Bearer token-123" }, cookies: {} } as Request;

  it("findOne retorna as preferências do usuário", async () => {
    const { controller, preferencesService } = createController();

    const result = await controller.findOne(req, "u1");

    expect(preferencesService.findOne).toHaveBeenCalledWith("token-123", "u1");
    expect(result.data).toEqual({ auto_draft_enabled: false });
  });

  it("update persiste a preferência", async () => {
    const { controller, preferencesService } = createController();

    const result = await controller.update(req, "u1", { auto_draft_enabled: true });

    expect(preferencesService.upsert).toHaveBeenCalledWith("token-123", "u1", {
      auto_draft_enabled: true,
    });
    expect(result.data).toEqual({ auto_draft_enabled: true });
  });

  it("update persiste apenas vehicle_chip_fields (RF-06)", async () => {
    const { controller, preferencesService } = createController({
      upsert: jest.fn().mockResolvedValue({
        auto_draft_enabled: false,
        vehicle_chip_fields: ["plate"],
      }),
    });

    const result = await controller.update(req, "u1", { vehicle_chip_fields: ["plate"] });

    expect(preferencesService.upsert).toHaveBeenCalledWith("token-123", "u1", {
      vehicle_chip_fields: ["plate"],
    });
    expect(result.data).toEqual({ auto_draft_enabled: false, vehicle_chip_fields: ["plate"] });
  });

  it("lança 401 quando não há token disponível", async () => {
    const { controller } = createController();
    const reqSemToken = { headers: {}, cookies: {} } as unknown as Request;

    await expect(controller.findOne(reqSemToken, "u1")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
