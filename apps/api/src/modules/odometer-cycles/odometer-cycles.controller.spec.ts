import { UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { OdometerCyclesController } from "./odometer-cycles.controller";
import type { OdometerCyclesService } from "./odometer-cycles.service";

describe("OdometerCyclesController", () => {
  function createController(overrides?: Partial<OdometerCyclesService>) {
    const odometerCyclesService = {
      create: jest.fn().mockResolvedValue({ id: "cy1", cycle_number: 2 }),
      findAll: jest.fn().mockResolvedValue([{ id: "cy1" }]),
      ...overrides,
    } as unknown as OdometerCyclesService;
    return {
      controller: new OdometerCyclesController(odometerCyclesService),
      odometerCyclesService,
    };
  }

  const req = { headers: { authorization: "Bearer token-123" }, cookies: {} } as Request;

  it("create extrai o token e cria o ciclo", async () => {
    const { controller, odometerCyclesService } = createController();

    const result = await controller.create(req, "u1", "v1", { starting_value: 0, reason: "Troca" });

    expect(odometerCyclesService.create).toHaveBeenCalledWith("token-123", "u1", "v1", {
      starting_value: 0,
      reason: "Troca",
    });
    expect(result.data).toEqual({ id: "cy1", cycle_number: 2 });
  });

  it("findAll lista os ciclos do veículo com paginação", async () => {
    const { controller, odometerCyclesService } = createController();

    const result = await controller.findAll(req, "u1", "v1", "10", "5");

    expect(odometerCyclesService.findAll).toHaveBeenCalledWith("token-123", "u1", "v1", 10, 5);
    expect(result.data).toEqual([{ id: "cy1" }]);
  });

  it("findAll usa defaults quando limit/offset não são informados", async () => {
    const { controller, odometerCyclesService } = createController();

    await controller.findAll(req, "u1", "v1");

    expect(odometerCyclesService.findAll).toHaveBeenCalledWith(
      "token-123",
      "u1",
      "v1",
      undefined,
      undefined,
    );
  });

  it("lança 401 quando não há token disponível", async () => {
    const { controller } = createController();
    const reqSemToken = { headers: {}, cookies: {} } as unknown as Request;

    await expect(controller.findAll(reqSemToken, "u1", "v1")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("usa o cookie de sessão quando não há header Authorization", async () => {
    const { controller, odometerCyclesService } = createController();
    const reqComCookie = {
      headers: {},
      cookies: { nave_access_token: "cookie-token" },
    } as unknown as Request;

    await controller.findAll(reqComCookie, "u1", "v1");

    expect(odometerCyclesService.findAll).toHaveBeenCalledWith(
      "cookie-token",
      "u1",
      "v1",
      undefined,
      undefined,
    );
  });
});
