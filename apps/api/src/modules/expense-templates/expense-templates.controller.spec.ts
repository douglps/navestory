import { UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { ExpenseTemplatesController } from "./expense-templates.controller";
import type { ExpenseTemplatesService } from "./expense-templates.service";

describe("ExpenseTemplatesController", () => {
  function createController(overrides?: Partial<ExpenseTemplatesService>) {
    const expenseTemplatesService = {
      findAll: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: "t1" }),
      update: jest.fn().mockResolvedValue({ id: "t1" }),
      touch: jest.fn().mockResolvedValue({ id: "t1" }),
      remove: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    } as unknown as ExpenseTemplatesService;
    return {
      controller: new ExpenseTemplatesController(expenseTemplatesService),
      expenseTemplatesService,
    };
  }

  const req = { headers: { authorization: "Bearer token-123" }, cookies: {} } as Request;

  it("findAll lista modelos do usuário", async () => {
    const { controller, expenseTemplatesService } = createController();

    const result = await controller.findAll(req, "u1");

    expect(expenseTemplatesService.findAll).toHaveBeenCalledWith("token-123", "u1");
    expect(result.data).toEqual([]);
  });

  it("create cria o modelo", async () => {
    const { controller, expenseTemplatesService } = createController();
    const dto = { name: "Modelo", vehicle_id: "v1", category: "fuel", amount: 100 };

    const result = await controller.create(req, "u1", dto);

    expect(expenseTemplatesService.create).toHaveBeenCalledWith("token-123", "u1", dto);
    expect(result.data).toEqual({ id: "t1" });
  });

  it("update atualiza o modelo", async () => {
    const { controller, expenseTemplatesService } = createController();

    const result = await controller.update(req, "u1", "t1", { name: "Novo nome" });

    expect(expenseTemplatesService.update).toHaveBeenCalledWith("token-123", "u1", "t1", {
      name: "Novo nome",
    });
    expect(result.data).toEqual({ id: "t1" });
  });

  it("touch marca o modelo como usado agora", async () => {
    const { controller, expenseTemplatesService } = createController();

    await controller.touch(req, "u1", "t1");

    expect(expenseTemplatesService.touch).toHaveBeenCalledWith("token-123", "u1", "t1");
  });

  it("remove remove o modelo", async () => {
    const { controller, expenseTemplatesService } = createController();

    await controller.remove(req, "u1", "t1");

    expect(expenseTemplatesService.remove).toHaveBeenCalledWith("token-123", "u1", "t1");
  });

  it("lança 401 quando não há token disponível", async () => {
    const { controller } = createController();
    const reqSemToken = { headers: {}, cookies: {} } as unknown as Request;

    await expect(controller.findAll(reqSemToken, "u1")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("usa o cookie de sessão quando não há header Authorization", async () => {
    const { controller, expenseTemplatesService } = createController();
    const reqComCookie = {
      headers: {},
      cookies: { nave_access_token: "cookie-token" },
    } as unknown as Request;

    await controller.findAll(reqComCookie, "u1");

    expect(expenseTemplatesService.findAll).toHaveBeenCalledWith("cookie-token", "u1");
  });
});
