import { UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { RecurringCostsController } from "./recurring-costs.controller";
import type { RecurringCostsService } from "./recurring-costs.service";

describe("RecurringCostsController", () => {
  function createController(overrides?: Partial<RecurringCostsService>) {
    const recurringCostsService = {
      create: jest.fn().mockResolvedValue({ id: "rc1" }),
      findAll: jest.fn().mockResolvedValue([{ id: "rc1" }]),
      findOne: jest.fn().mockResolvedValue({ id: "rc1" }),
      update: jest.fn().mockResolvedValue({ id: "rc1", paid_at: "2026-03-15" }),
      remove: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    } as unknown as RecurringCostsService;
    return {
      controller: new RecurringCostsController(recurringCostsService),
      recurringCostsService,
    };
  }

  const req = {
    headers: { authorization: "Bearer token-123" },
    cookies: {},
  } as Request;

  it("create cria o custo recorrente", async () => {
    const { controller, recurringCostsService } = createController();
    const dto = {
      vehicle_id: "v1",
      cost_type: "ipva",
      year: 2026,
      amount: 1250,
      due_date: "2026-03-31",
    };

    const result = await controller.create(req, "u1", dto as never);

    expect(recurringCostsService.create).toHaveBeenCalledWith(
      "token-123",
      "u1",
      dto,
    );
    expect(result.data).toEqual({ id: "rc1" });
  });

  it("findAll lista custos recorrentes com filtros", async () => {
    const { controller, recurringCostsService } = createController();
    const query = { year: 2026 } as never;

    const result = await controller.findAll(req, "u1", query);

    expect(recurringCostsService.findAll).toHaveBeenCalledWith(
      "token-123",
      "u1",
      query,
    );
    expect(result.data).toEqual([{ id: "rc1" }]);
  });

  it("findOne busca o custo recorrente por id", async () => {
    const { controller, recurringCostsService } = createController();

    const result = await controller.findOne(req, "u1", "rc1");

    expect(recurringCostsService.findOne).toHaveBeenCalledWith(
      "token-123",
      "u1",
      "rc1",
    );
    expect(result.data).toEqual({ id: "rc1" });
  });

  it("update atualiza o custo recorrente (registrar pagamento)", async () => {
    const { controller, recurringCostsService } = createController();

    const result = await controller.update(req, "u1", "rc1", {
      paid_at: "2026-03-15",
    } as never);

    expect(recurringCostsService.update).toHaveBeenCalledWith(
      "token-123",
      "u1",
      "rc1",
      {
        paid_at: "2026-03-15",
      },
    );
    expect(result.data).toEqual({ id: "rc1", paid_at: "2026-03-15" });
  });

  it("remove remove o custo recorrente", async () => {
    const { controller, recurringCostsService } = createController();

    await controller.remove(req, "u1", "rc1");

    expect(recurringCostsService.remove).toHaveBeenCalledWith(
      "token-123",
      "u1",
      "rc1",
    );
  });

  it("lança 401 quando não há token disponível", async () => {
    const { controller } = createController();
    const reqSemToken = { headers: {}, cookies: {} } as unknown as Request;

    await expect(
      controller.findOne(reqSemToken, "u1", "rc1"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("usa o cookie de sessão quando não há header Authorization", async () => {
    const { controller, recurringCostsService } = createController();
    const reqComCookie = {
      headers: {},
      cookies: { navestory_access_token: "cookie-token" },
    } as unknown as Request;

    await controller.findOne(reqComCookie, "u1", "rc1");

    expect(recurringCostsService.findOne).toHaveBeenCalledWith(
      "cookie-token",
      "u1",
      "rc1",
    );
  });
});
