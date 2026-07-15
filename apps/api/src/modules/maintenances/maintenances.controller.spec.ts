import { UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { MaintenancesController } from "./maintenances.controller";
import type { MaintenancesService } from "./maintenances.service";

describe("MaintenancesController", () => {
  function createController(overrides?: Partial<MaintenancesService>) {
    const maintenancesService = {
      create: jest.fn().mockResolvedValue({ id: "m1" }),
      findAll: jest.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, has_next: false } }),
      findOne: jest.fn().mockResolvedValue({ id: "m1" }),
      update: jest.fn().mockResolvedValue({ id: "m1" }),
      remove: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    } as unknown as MaintenancesService;
    return { controller: new MaintenancesController(maintenancesService), maintenancesService };
  }

  const req = { headers: { authorization: "Bearer token-123" }, cookies: {} } as Request;

  it("create cria a manutenção", async () => {
    const { controller, maintenancesService } = createController();
    const dto = { vehicle_id: "v1", description: "Troca de óleo", scheduled_date: "2026-08-01" };

    const result = await controller.create(req, "u1", dto as never);

    expect(maintenancesService.create).toHaveBeenCalledWith("token-123", "u1", dto);
    expect(result.data).toEqual({ id: "m1" });
  });

  it("findAll lista manutenções paginadas do usuário", async () => {
    const { controller, maintenancesService } = createController();

    const result = await controller.findAll(req, "u1", { page: 1, limit: 20 } as never);

    expect(maintenancesService.findAll).toHaveBeenCalledWith("token-123", "u1", { page: 1, limit: 20 });
    expect(result.data).toEqual([]);
  });

  it("findOne busca a manutenção por id", async () => {
    const { controller, maintenancesService } = createController();

    const result = await controller.findOne(req, "u1", "m1");

    expect(maintenancesService.findOne).toHaveBeenCalledWith("token-123", "u1", "m1");
    expect(result.data).toEqual({ id: "m1" });
  });

  it("update atualiza a manutenção", async () => {
    const { controller, maintenancesService } = createController();

    const result = await controller.update(req, "u1", "m1", { status: "in_progress" } as never);

    expect(maintenancesService.update).toHaveBeenCalledWith("token-123", "u1", "m1", {
      status: "in_progress",
    });
    expect(result.data).toEqual({ id: "m1" });
  });

  it("remove remove a manutenção", async () => {
    const { controller, maintenancesService } = createController();

    await controller.remove(req, "u1", "m1");

    expect(maintenancesService.remove).toHaveBeenCalledWith("token-123", "u1", "m1");
  });

  it("lança 401 quando não há token disponível", async () => {
    const { controller } = createController();
    const reqSemToken = { headers: {}, cookies: {} } as unknown as Request;

    await expect(controller.findOne(reqSemToken, "u1", "m1")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
