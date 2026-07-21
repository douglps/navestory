import { UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { FinesController } from "./fines.controller";
import type { FinesService } from "./fines.service";

describe("FinesController", () => {
  function createController(overrides?: Partial<FinesService>) {
    const finesService = {
      create: jest.fn().mockResolvedValue({ id: "f1" }),
      findAll: jest.fn().mockResolvedValue([]),
      findByVehicle: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue({ id: "f1" }),
      update: jest.fn().mockResolvedValue({ id: "f1" }),
      remove: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    } as unknown as FinesService;
    return { controller: new FinesController(finesService), finesService };
  }

  const req = { headers: { authorization: "Bearer token-123" }, cookies: {} } as Request;

  it("create cria a multa", async () => {
    const { controller, finesService } = createController();
    const dto = {
      vehicle_id: "v1",
      description: "Excesso de velocidade",
      amount: 195.23,
      occurred_at: "2026-07-01",
    };

    const result = await controller.create(req, "u1", dto as never);

    expect(finesService.create).toHaveBeenCalledWith("token-123", "u1", dto);
    expect(result.data).toEqual({ id: "f1" });
  });

  it("findAll lista multas do usuário com filtro de status", async () => {
    const { controller, finesService } = createController();

    const result = await controller.findAll(req, "u1", { status: "pending" } as never);

    expect(finesService.findAll).toHaveBeenCalledWith("token-123", "u1", "pending");
    expect(result.data).toEqual([]);
  });

  it("findByVehicle lista multas de um veículo específico", async () => {
    const { controller, finesService } = createController();

    await controller.findByVehicle(req, "u1", "v1");

    expect(finesService.findByVehicle).toHaveBeenCalledWith("token-123", "u1", "v1");
  });

  it("findOne busca a multa por id", async () => {
    const { controller, finesService } = createController();

    const result = await controller.findOne(req, "u1", "f1");

    expect(finesService.findOne).toHaveBeenCalledWith("token-123", "u1", "f1");
    expect(result.data).toEqual({ id: "f1" });
  });

  it("update atualiza a multa", async () => {
    const { controller, finesService } = createController();

    const result = await controller.update(req, "u1", "f1", { status: "paid" } as never);

    expect(finesService.update).toHaveBeenCalledWith("token-123", "u1", "f1", { status: "paid" });
    expect(result.data).toEqual({ id: "f1" });
  });

  it("remove remove a multa", async () => {
    const { controller, finesService } = createController();

    await controller.remove(req, "u1", "f1");

    expect(finesService.remove).toHaveBeenCalledWith("token-123", "u1", "f1");
  });

  it("lança 401 quando não há token disponível", async () => {
    const { controller } = createController();
    const reqSemToken = { headers: {}, cookies: {} } as unknown as Request;

    await expect(controller.findOne(reqSemToken, "u1", "f1")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("usa o cookie de sessão quando não há header Authorization", async () => {
    const { controller, finesService } = createController();
    const reqComCookie = {
      headers: {},
      cookies: { nave_access_token: "cookie-token" },
    } as unknown as Request;

    await controller.findOne(reqComCookie, "u1", "f1");

    expect(finesService.findOne).toHaveBeenCalledWith("cookie-token", "u1", "f1");
  });
});
