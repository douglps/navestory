import { UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { VehiclesController } from "./vehicles.controller";
import type { VehiclesService } from "./vehicles.service";

describe("VehiclesController", () => {
  function createController(overrides?: Partial<VehiclesService>) {
    const vehiclesService = {
      create: jest.fn().mockResolvedValue({ id: "v1" }),
      findAll: jest.fn().mockResolvedValue([{ id: "v1" }]),
      findOne: jest.fn().mockResolvedValue({ id: "v1" }),
      update: jest.fn().mockResolvedValue({ id: "v1", color: "Azul" }),
      remove: jest.fn().mockResolvedValue(undefined),
      getHealth: jest.fn().mockResolvedValue({ score: 100, flags: [] }),
      ...overrides,
    } as unknown as VehiclesService;
    return {
      controller: new VehiclesController(vehiclesService),
      vehiclesService,
    };
  }

  const req = {
    headers: { authorization: "Bearer token-123" },
    cookies: {},
  } as Request;

  it("create extrai o token e cria o veículo", async () => {
    const { controller, vehiclesService } = createController();

    const result = await controller.create(req, "u1", {
      plate: "ABC1234",
    } as never);

    expect(vehiclesService.create).toHaveBeenCalledWith("token-123", "u1", {
      plate: "ABC1234",
    });
    expect(result.data).toEqual({ id: "v1" });
  });

  it("findAll lista os veículos do usuário", async () => {
    const { controller, vehiclesService } = createController();

    const result = await controller.findAll(req, "u1");

    expect(vehiclesService.findAll).toHaveBeenCalledWith("token-123", "u1");
    expect(result.data).toEqual([{ id: "v1" }]);
  });

  it("findOne retorna o veículo pelo id", async () => {
    const { controller, vehiclesService } = createController();

    const result = await controller.findOne(req, "u1", "v1");

    expect(vehiclesService.findOne).toHaveBeenCalledWith(
      "token-123",
      "u1",
      "v1",
    );
    expect(result.data).toEqual({ id: "v1" });
  });

  it("update atualiza o veículo", async () => {
    const { controller, vehiclesService } = createController();

    const result = await controller.update(req, "u1", "v1", {
      color: "Azul",
    } as never);

    expect(vehiclesService.update).toHaveBeenCalledWith(
      "token-123",
      "u1",
      "v1",
      {
        color: "Azul",
      },
    );
    expect(result.data).toEqual({ id: "v1", color: "Azul" });
  });

  it("getHealth retorna score e flags do veículo (SPEC-20260730-001 RF-19)", async () => {
    const { controller, vehiclesService } = createController();

    const result = await controller.getHealth(req, "v1");

    expect(vehiclesService.getHealth).toHaveBeenCalledWith("token-123", "v1");
    expect(result.data).toEqual({ score: 100, flags: [] });
  });

  it("remove remove o veículo", async () => {
    const { controller, vehiclesService } = createController();

    await controller.remove(req, "u1", "v1");

    expect(vehiclesService.remove).toHaveBeenCalledWith(
      "token-123",
      "u1",
      "v1",
    );
  });

  it("lança 401 quando não há token disponível", async () => {
    const { controller } = createController();
    const reqSemToken = { headers: {}, cookies: {} } as unknown as Request;

    await expect(controller.findAll(reqSemToken, "u1")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("usa o cookie de sessão quando não há header Authorization", async () => {
    const { controller, vehiclesService } = createController();
    const reqComCookie = {
      headers: {},
      cookies: { navestory_access_token: "cookie-token" },
    } as unknown as Request;

    await controller.findAll(reqComCookie, "u1");

    expect(vehiclesService.findAll).toHaveBeenCalledWith("cookie-token", "u1");
  });
});
