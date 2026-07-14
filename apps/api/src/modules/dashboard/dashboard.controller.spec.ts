import { UnauthorizedException } from "@nestjs/common";
import type { Request, Response } from "express";
import { DashboardController } from "./dashboard.controller";
import type { DashboardService } from "./dashboard.service";

describe("DashboardController", () => {
  function createController(overrides?: Partial<DashboardService>) {
    const dashboardService = {
      exportExpensesCsv: jest.fn().mockResolvedValue("Data,Placa,Modelo,Categoria,Descricao,Valor\n"),
      ...overrides,
    } as unknown as DashboardService;
    return { controller: new DashboardController(dashboardService), dashboardService };
  }

  function createRes(): Response {
    return {
      setHeader: jest.fn(),
      send: jest.fn(),
    } as unknown as Response;
  }

  const req = { headers: { authorization: "Bearer token-123" }, cookies: {} } as Request;

  it("exportCsv extrai o token, monta headers e envia o CSV com BOM (RF-01, RF-05, CA-01)", async () => {
    const { controller, dashboardService } = createController();
    const res = createRes();

    await controller.exportCsv(req, "u1", { period: "2026-05", vehicle_id: undefined }, res);

    expect(dashboardService.exportExpensesCsv).toHaveBeenCalledWith(
      "token-123",
      "u1",
      "2026-05",
      undefined,
    );
    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/csv; charset=utf-8");
    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Disposition",
      'attachment; filename="nave-despesas-2026-05.csv"',
    );
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining("Data,Placa,Modelo"));
  });

  it("repassa vehicle_id quando informado (RF-03, CA-06)", async () => {
    const { controller, dashboardService } = createController();
    const res = createRes();

    await controller.exportCsv(req, "u1", { period: "2026-05", vehicle_id: "veh1" }, res);

    expect(dashboardService.exportExpensesCsv).toHaveBeenCalledWith(
      "token-123",
      "u1",
      "2026-05",
      "veh1",
    );
  });

  it("lança 401 quando não há token disponível (CA-05)", async () => {
    const { controller } = createController();
    const reqSemToken = { headers: {}, cookies: {} } as unknown as Request;

    await expect(
      controller.exportCsv(reqSemToken, "u1", { period: "2026-05", vehicle_id: undefined }, createRes()),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
