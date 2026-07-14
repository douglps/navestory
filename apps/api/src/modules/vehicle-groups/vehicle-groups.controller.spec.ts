import { UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { VehicleGroupsController } from "./vehicle-groups.controller";
import type { VehicleGroupsService } from "./vehicle-groups.service";

describe("VehicleGroupsController", () => {
  function createController(overrides?: Partial<VehicleGroupsService>) {
    const vehicleGroupsService = {
      create: jest.fn().mockResolvedValue({ id: "g1" }),
      findAll: jest.fn().mockResolvedValue([{ id: "g1" }]),
      update: jest.fn().mockResolvedValue({ id: "g1", name: "Frota SP" }),
      remove: jest.fn().mockResolvedValue(undefined),
      setMembers: jest.fn().mockResolvedValue({ vehicleIds: ["v1"] }),
      ...overrides,
    } as unknown as VehicleGroupsService;
    return {
      controller: new VehicleGroupsController(vehicleGroupsService),
      vehicleGroupsService,
    };
  }

  const req = { headers: { authorization: "Bearer token-123" }, cookies: {} } as Request;

  it("create extrai o token e cria o grupo", async () => {
    const { controller, vehicleGroupsService } = createController();

    const result = await controller.create(req, "u1", { name: "Motos", color: "#ef4444" });

    expect(vehicleGroupsService.create).toHaveBeenCalledWith("token-123", "u1", {
      name: "Motos",
      color: "#ef4444",
    });
    expect(result.data).toEqual({ id: "g1" });
  });

  it("findAll lista os grupos do usuário", async () => {
    const { controller, vehicleGroupsService } = createController();

    const result = await controller.findAll(req, "u1");

    expect(vehicleGroupsService.findAll).toHaveBeenCalledWith("token-123", "u1");
    expect(result.data).toEqual([{ id: "g1" }]);
  });

  it("update atualiza o grupo", async () => {
    const { controller, vehicleGroupsService } = createController();

    const result = await controller.update(req, "u1", "g1", { name: "Frota SP" });

    expect(vehicleGroupsService.update).toHaveBeenCalledWith("token-123", "u1", "g1", {
      name: "Frota SP",
    });
    expect(result.data).toEqual({ id: "g1", name: "Frota SP" });
  });

  it("remove remove o grupo", async () => {
    const { controller, vehicleGroupsService } = createController();

    await controller.remove(req, "u1", "g1");

    expect(vehicleGroupsService.remove).toHaveBeenCalledWith("token-123", "u1", "g1");
  });

  it("setMembers substitui os membros do grupo", async () => {
    const { controller, vehicleGroupsService } = createController();

    const result = await controller.setMembers(req, "u1", "g1", { vehicleIds: ["v1"] });

    expect(vehicleGroupsService.setMembers).toHaveBeenCalledWith("token-123", "u1", "g1", {
      vehicleIds: ["v1"],
    });
    expect(result.data).toEqual({ vehicleIds: ["v1"] });
  });

  it("lança 401 quando não há token disponível", async () => {
    const { controller } = createController();
    const reqSemToken = { headers: {}, cookies: {} } as unknown as Request;

    await expect(controller.findAll(reqSemToken, "u1")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
