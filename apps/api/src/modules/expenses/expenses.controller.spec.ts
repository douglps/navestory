import { UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { ExpensesController } from "./expenses.controller";
import type { ExpensesService } from "./expenses.service";

describe("ExpensesController", () => {
  function createController(overrides?: Partial<ExpensesService>) {
    const expensesService = {
      create: jest.fn().mockResolvedValue({ id: "e1" }),
      findAll: jest.fn().mockResolvedValue({
        data: [{ id: "e1" }],
        meta: { total: 1, page: 1, limit: 20, has_next: false },
      }),
      findOne: jest.fn().mockResolvedValue({ id: "e1" }),
      update: jest.fn().mockResolvedValue({ id: "e1", amount: 200 }),
      remove: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    } as unknown as ExpensesService;
    return { controller: new ExpensesController(expensesService), expensesService };
  }

  const req = { headers: { authorization: "Bearer token-123" }, cookies: {} } as Request;

  it("create extrai o token e cria a despesa", async () => {
    const { controller, expensesService } = createController();

    const result = await controller.create(req, "u1", { amount: 150 } as never);

    expect(expensesService.create).toHaveBeenCalledWith("token-123", "u1", { amount: 150 });
    expect(result.data).toEqual({ id: "e1" });
  });

  it("findAll retorna envelope paginado", async () => {
    const { controller, expensesService } = createController();
    const query = { page: 1, limit: 20 } as never;

    const result = await controller.findAll(req, "u1", query);

    expect(expensesService.findAll).toHaveBeenCalledWith("token-123", "u1", query);
    expect(result.meta).toEqual({ total: 1, page: 1, limit: 20, has_next: false });
  });

  it("findOne retorna a despesa pelo id", async () => {
    const { controller, expensesService } = createController();

    const result = await controller.findOne(req, "u1", "e1");

    expect(expensesService.findOne).toHaveBeenCalledWith("token-123", "u1", "e1");
    expect(result.data).toEqual({ id: "e1" });
  });

  it("update atualiza a despesa", async () => {
    const { controller, expensesService } = createController();

    const result = await controller.update(req, "u1", "e1", { amount: 200 } as never);

    expect(expensesService.update).toHaveBeenCalledWith("token-123", "u1", "e1", { amount: 200 });
    expect(result.data).toEqual({ id: "e1", amount: 200 });
  });

  it("remove remove a despesa", async () => {
    const { controller, expensesService } = createController();

    await controller.remove(req, "u1", "e1");

    expect(expensesService.remove).toHaveBeenCalledWith("token-123", "u1", "e1");
  });

  it("lança 401 quando não há token disponível", async () => {
    const { controller } = createController();
    const reqSemToken = { headers: {}, cookies: {} } as unknown as Request;

    await expect(
      controller.findAll(reqSemToken, "u1", { page: 1, limit: 20 } as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
