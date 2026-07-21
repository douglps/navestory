import { UnauthorizedException } from "@nestjs/common";
import type { Request, Response } from "express";
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
      listSuppliers: jest.fn().mockResolvedValue(["Shell Av. Paulista"]),
      getUpcomingCosts: jest.fn().mockResolvedValue([{ source_type: "fine", source_id: "f1" }]),
      getKpis: jest.fn().mockResolvedValue({
        total_this_month: 100,
        total_prev_month: 50,
        delta_percent: 100,
        total_all_time: 500,
        upcoming_30_days_total: 30,
        upcoming_30_days_count: 1,
      }),
      exportConsolidatedCsv: jest.fn().mockResolvedValue("Data,Veiculo,Placa,Categoria,Valor,Origem,Descricao\n"),
      ...overrides,
    } as unknown as ExpensesService;
    return { controller: new ExpensesController(expensesService), expensesService };
  }

  function createRes(): Response {
    return {
      setHeader: jest.fn(),
      send: jest.fn(),
    } as unknown as Response;
  }

  const req = { headers: { authorization: "Bearer token-123" }, cookies: {} } as Request;

  it("create extrai o token e cria a despesa", async () => {
    const { controller, expensesService } = createController();

    const result = await controller.create(req, "u1", { amount: 150 } as never);

    expect(expensesService.create).toHaveBeenCalledWith("token-123", "u1", { amount: 150 }, false);
    expect(result.data).toEqual({ id: "e1" });
  });

  /**
   * @spec SPEC-20260612-001 RF-04
   */
  it("create repassa strict=true quando o query param strict=true (web)", async () => {
    const { controller, expensesService } = createController();

    await controller.create(req, "u1", { amount: 150 } as never, "true");

    expect(expensesService.create).toHaveBeenCalledWith("token-123", "u1", { amount: 150 }, true);
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

    expect(expensesService.update).toHaveBeenCalledWith("token-123", "u1", "e1", { amount: 200 }, false);
    expect(result.data).toEqual({ id: "e1", amount: 200 });
  });

  /**
   * @spec SPEC-20260612-001 RF-04
   */
  it("update repassa strict=true quando o query param strict=true (web)", async () => {
    const { controller, expensesService } = createController();

    await controller.update(req, "u1", "e1", { amount: 200 } as never, "true");

    expect(expensesService.update).toHaveBeenCalledWith("token-123", "u1", "e1", { amount: 200 }, true);
  });

  it("listSuppliers retorna sugestões de fornecedores (SPEC-20260606-002 RF-02)", async () => {
    const { controller, expensesService } = createController();

    const result = await controller.listSuppliers(req, "u1");

    expect(expensesService.listSuppliers).toHaveBeenCalledWith("token-123", "u1");
    expect(result.data).toEqual(["Shell Av. Paulista"]);
  });

  it("getUpcoming retorna a lista de próximas despesas (SPEC-20260608-001 RF-01)", async () => {
    const { controller, expensesService } = createController();
    const query = { horizon_days: 30 } as never;

    const result = await controller.getUpcoming(req, query);

    expect(expensesService.getUpcomingCosts).toHaveBeenCalledWith("token-123", query);
    expect(result.data).toEqual([{ source_type: "fine", source_id: "f1" }]);
  });

  it("getKpis retorna os KPIs financeiros (SPEC-20260608-002 RF-01)", async () => {
    const { controller, expensesService } = createController();
    const query = {} as never;

    const result = await controller.getKpis(req, "u1", query);

    expect(expensesService.getKpis).toHaveBeenCalledWith("token-123", "u1", query);
    expect(result.data.total_this_month).toBe(100);
  });

  it("exportConsolidated monta headers e envia o CSV com BOM (SPEC-20260609-003 RF-01)", async () => {
    const { controller, expensesService } = createController();
    const res = createRes();

    await controller.exportConsolidated(req, "u1", {} as never, res);

    expect(expensesService.exportConsolidatedCsv).toHaveBeenCalledWith("token-123", "u1", {});
    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/csv; charset=utf-8");
    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Disposition",
      expect.stringContaining("nave-despesas-completo-"),
    );
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining("Data,Veiculo,Placa"));
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

  it("usa o cookie de sessão quando não há header Authorization", async () => {
    const { controller, expensesService } = createController();
    const reqComCookie = {
      headers: {},
      cookies: { nave_access_token: "cookie-token" },
    } as unknown as Request;

    await controller.findAll(reqComCookie, "u1", { page: 1, limit: 20 } as never);

    expect(expensesService.findAll).toHaveBeenCalledWith(
      "cookie-token",
      "u1",
      { page: 1, limit: 20 },
    );
  });
});
