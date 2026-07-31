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
      getFleetKpiCatalog: jest.fn().mockResolvedValue({}),
      getVehicleCards: jest.fn().mockResolvedValue([]),
      getSpendingHighlights: jest.fn().mockResolvedValue([]),
      getFinesStatus: jest.fn().mockResolvedValue({ status: "none", count: 0 }),
      getFleetCharts: jest.fn().mockResolvedValue({ cost_per_km: [], fuel_liters: [], category_breakdown: [] }),
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

    await controller.getAlerts(req, "u1", {});

    expect(dashboardService.getAlerts).toHaveBeenCalledWith("token-123", "u1", {
      includeUpcomingDocuments: undefined,
    });
  });

  it("getAlerts repassa include_upcoming=true como includeUpcomingDocuments (opt-in)", async () => {
    const { controller, dashboardService } = createController();

    await controller.getAlerts(req, "u1", { include_upcoming: true });

    expect(dashboardService.getAlerts).toHaveBeenCalledWith("token-123", "u1", {
      includeUpcomingDocuments: true,
    });
  });

  it("getFleetKpis repassa o vehicle_id da query para 'próxima manutenção' (RF-DA-03)", async () => {
    const { controller, dashboardService } = createController();

    await controller.getFleetKpis(req, "u1", { vehicle_id: "v1" });

    expect(dashboardService.getFleetKpis).toHaveBeenCalledWith("token-123", "u1", "v1");
  });

  it("getFleetKpiCatalog repassa o vehicle_id da query e devolve { data } (RF-01)", async () => {
    const { controller, dashboardService } = createController({
      getFleetKpiCatalog: jest.fn().mockResolvedValue({ expenses_month: { ok: true, value: 1 } }),
    });

    const result = await controller.getFleetKpiCatalog(req, "u1", { vehicle_id: "v1" });

    expect(dashboardService.getFleetKpiCatalog).toHaveBeenCalledWith("token-123", "u1", "v1");
    expect(result).toEqual({ data: { expenses_month: { ok: true, value: 1 } } });
  });

  it("getVehicleCards extrai o token e devolve { data } (RF-DA-04)", async () => {
    const { controller, dashboardService } = createController();

    await controller.getVehicleCards(req, "u1");

    expect(dashboardService.getVehicleCards).toHaveBeenCalledWith("token-123", "u1");
  });

  it("getSpendingHighlights repassa vehicleId/groupIds e devolve { data } (RF-01)", async () => {
    const { controller, dashboardService } = createController({
      getSpendingHighlights: jest.fn().mockResolvedValue([
        { category: "fuel", label: "Combustível", total_amount: 100, count: 2 },
      ]),
    });

    const result = await controller.getSpendingHighlights(req, {
      vehicleId: "veh1",
      groupIds: ["g1", "g2"],
    });

    expect(dashboardService.getSpendingHighlights).toHaveBeenCalledWith("token-123", "veh1", ["g1", "g2"]);
    expect(result).toEqual({ data: [{ category: "fuel", label: "Combustível", total_amount: 100, count: 2 }] });
  });

  it("getFinesStatus extrai o token e devolve { data } (RF-02)", async () => {
    const { controller, dashboardService } = createController({
      getFinesStatus: jest.fn().mockResolvedValue({ status: "overdue", count: 3 }),
    });

    const result = await controller.getFinesStatus(req, "u1");

    expect(dashboardService.getFinesStatus).toHaveBeenCalledWith("token-123", "u1");
    expect(result).toEqual({ data: { status: "overdue", count: 3 } });
  });

  it("getFleetCharts extrai o token e devolve { data } (RF-08)", async () => {
    const { controller, dashboardService } = createController({
      getFleetCharts: jest.fn().mockResolvedValue({
        cost_per_km: [{ month: "2026-07", value: 0.5 }],
        fuel_liters: [{ month: "2026-07", value: 40 }],
        category_breakdown: [{ category: "fuel", label: "Combustível", total_amount: 100, count: 2 }],
      }),
    });

    const result = await controller.getFleetCharts(req, "u1");

    expect(dashboardService.getFleetCharts).toHaveBeenCalledWith("token-123", "u1");
    expect(result).toEqual({
      data: {
        cost_per_km: [{ month: "2026-07", value: 0.5 }],
        fuel_liters: [{ month: "2026-07", value: 40 }],
        category_breakdown: [{ category: "fuel", label: "Combustível", total_amount: 100, count: 2 }],
      },
    });
  });

  it("usa o cookie de sessão quando não há header Authorization", async () => {
    const { controller, dashboardService } = createController();
    const reqComCookie = {
      headers: {},
      cookies: { nave_access_token: "cookie-token" },
    } as unknown as Request;

    await controller.getAlerts(reqComCookie, "u1", {});

    expect(dashboardService.getAlerts).toHaveBeenCalledWith("cookie-token", "u1", {
      includeUpcomingDocuments: undefined,
    });
  });
});
