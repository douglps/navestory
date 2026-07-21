import { UnauthorizedException } from "@nestjs/common";
import type { Request, Response } from "express";
import { DashboardController } from "./dashboard.controller";
import type { DashboardService } from "./dashboard.service";

describe("DashboardController", () => {
  function createController(overrides?: Partial<DashboardService>) {
    const dashboardService = {
      exportExpensesCsv: jest.fn().mockResolvedValue("Data,Placa,Modelo,Categoria,Descricao,Valor\n"),
      getFleetHealth: jest.fn().mockResolvedValue([]),
      getAlerts: jest.fn().mockResolvedValue([]),
      getFleetKpis: jest.fn().mockResolvedValue({}),
      getVehicleCards: jest.fn().mockResolvedValue([]),
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

  it("getFleetHealth extrai o token e devolve { data } (RF-SH-01)", async () => {
    const { controller, dashboardService } = createController({
      getFleetHealth: jest.fn().mockResolvedValue([{ vehicle_id: "v1", score: 80, flags: [] }]),
    });

    const result = await controller.getFleetHealth(req, "u1");

    expect(dashboardService.getFleetHealth).toHaveBeenCalledWith("token-123", "u1");
    expect(result).toEqual({ data: [{ vehicle_id: "v1", score: 80, flags: [] }] });
  });

  it("getAlerts extrai o token e devolve { data } (RF-DA-01)", async () => {
    const { controller, dashboardService } = createController();

    await controller.getAlerts(req, "u1");

    expect(dashboardService.getAlerts).toHaveBeenCalledWith("token-123", "u1");
  });

  it("getFleetKpis repassa o vehicle_id da query para 'próxima manutenção' (RF-DA-03)", async () => {
    const { controller, dashboardService } = createController();

    await controller.getFleetKpis(req, "u1", { vehicle_id: "v1" });

    expect(dashboardService.getFleetKpis).toHaveBeenCalledWith("token-123", "u1", "v1");
  });

  it("getVehicleCards extrai o token e devolve { data } (RF-DA-04)", async () => {
    const { controller, dashboardService } = createController();

    await controller.getVehicleCards(req, "u1");

    expect(dashboardService.getVehicleCards).toHaveBeenCalledWith("token-123", "u1");
  });

  it("usa o cookie de sessão quando não há header Authorization", async () => {
    const { controller, dashboardService } = createController();
    const reqComCookie = {
      headers: {},
      cookies: { nave_access_token: "cookie-token" },
    } as unknown as Request;

    await controller.getAlerts(reqComCookie, "u1");

    expect(dashboardService.getAlerts).toHaveBeenCalledWith("cookie-token", "u1");
  });
});
