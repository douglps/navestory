import { UnauthorizedException } from "@nestjs/common";
import type { Request, Response } from "express";
import { AnalyticsController } from "./analytics.controller";
import type { AnalyticsService } from "./analytics.service";

describe("AnalyticsController", () => {
  function createController(overrides?: Partial<AnalyticsService>) {
    const analyticsService = {
      getTco: jest.fn().mockResolvedValue({}),
      getFuelTrend: jest.fn().mockResolvedValue([]),
      getAnomalies: jest.fn().mockResolvedValue([]),
      getBenchmark: jest.fn().mockResolvedValue([]),
      getForecast: jest.fn().mockResolvedValue([]),
      getSeasonal: jest.fn().mockResolvedValue([]),
      getInsights: jest.fn().mockResolvedValue([]),
      exportCsv: jest.fn().mockResolvedValue("csv-content"),
      ...overrides,
    } as unknown as AnalyticsService;
    return { controller: new AnalyticsController(analyticsService), analyticsService };
  }

  const req = { headers: { authorization: "Bearer token-123" }, cookies: {} } as Request;

  describe("getTco (RF-01, RF-07)", () => {
    it("extrai o token e delega para o service", async () => {
      const tco = { total: 100 };
      const { controller, analyticsService } = createController({
        getTco: jest.fn().mockResolvedValue(tco),
      });

      const result = await controller.getTco(req, "v1");

      expect(analyticsService.getTco).toHaveBeenCalledWith("token-123", "v1");
      expect(result).toEqual({ data: tco });
    });

    it("lança UnauthorizedException quando não há token", async () => {
      const { controller } = createController();
      const reqSemToken = { headers: {}, cookies: {} } as Request;

      await expect(controller.getTco(reqSemToken, "v1")).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("getFuelTrend (RF-02, RF-08)", () => {
    it("extrai o token e repassa o limit do query param", async () => {
      const points = [{ expense_id: "e1" }];
      const { controller, analyticsService } = createController({
        getFuelTrend: jest.fn().mockResolvedValue(points),
      });

      const result = await controller.getFuelTrend(req, "v1", { limit: 20 });

      expect(analyticsService.getFuelTrend).toHaveBeenCalledWith("token-123", "v1", 20);
      expect(result).toEqual({ data: points });
    });
  });

  describe("getAnomalies (RF-03, RF-09)", () => {
    it("extrai o token e repassa threshold/vehicle_id do query param", async () => {
      const anomalies = [{ expense_id: "e1" }];
      const { controller, analyticsService } = createController({
        getAnomalies: jest.fn().mockResolvedValue(anomalies),
      });

      const result = await controller.getAnomalies(req, { threshold: 2.5, vehicle_id: "v1" });

      expect(analyticsService.getAnomalies).toHaveBeenCalledWith("token-123", 2.5, "v1");
      expect(result).toEqual({ data: anomalies });
    });

    it("lança UnauthorizedException quando não há token", async () => {
      const { controller } = createController();
      const reqSemToken = { headers: {}, cookies: {} } as Request;

      await expect(
        controller.getAnomalies(reqSemToken, { threshold: 2.0 }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("getBenchmark (RF-04, RF-10)", () => {
    it("extrai o token e delega para o service", async () => {
      const benchmark = [{ vehicle_id: "v1" }];
      const { controller, analyticsService } = createController({
        getBenchmark: jest.fn().mockResolvedValue(benchmark),
      });

      const result = await controller.getBenchmark(req);

      expect(analyticsService.getBenchmark).toHaveBeenCalledWith("token-123");
      expect(result).toEqual({ data: benchmark });
    });
  });

  describe("getForecast (RF-05, RF-11)", () => {
    it("extrai o token e repassa vehicle_id/months do query param", async () => {
      const points = [{ month: "2026-07-01" }];
      const { controller, analyticsService } = createController({
        getForecast: jest.fn().mockResolvedValue(points),
      });

      const result = await controller.getForecast(req, { vehicle_id: "v1", months: 6 });

      expect(analyticsService.getForecast).toHaveBeenCalledWith("token-123", "v1", 6);
      expect(result).toEqual({ data: points });
    });
  });

  describe("getSeasonal (RF-06, RF-12)", () => {
    it("extrai o token e repassa vehicle_id do query param", async () => {
      const cells = [{ month_number: 1 }];
      const { controller, analyticsService } = createController({
        getSeasonal: jest.fn().mockResolvedValue(cells),
      });

      const result = await controller.getSeasonal(req, { vehicle_id: "v1" });

      expect(analyticsService.getSeasonal).toHaveBeenCalledWith("token-123", "v1");
      expect(result).toEqual({ data: cells });
    });
  });

  describe("getInsights (RF-14)", () => {
    it("extrai o token, o userId e repassa vehicle_id do query param", async () => {
      const insights = [{ type: "efficiency", vehicle_id: "v1", message: "..." }];
      const { controller, analyticsService } = createController({
        getInsights: jest.fn().mockResolvedValue(insights),
      });

      const result = await controller.getInsights(req, "user-1", { vehicle_id: "v1" });

      expect(analyticsService.getInsights).toHaveBeenCalledWith("token-123", "user-1", "v1");
      expect(result).toEqual({ data: insights });
    });
  });

  it("usa o cookie de sessão quando não há header Authorization", async () => {
    const { controller, analyticsService } = createController();
    const reqComCookie = {
      headers: {},
      cookies: { nave_access_token: "cookie-token" },
    } as unknown as Request;

    await controller.getTco(reqComCookie, "v1");

    expect(analyticsService.getTco).toHaveBeenCalledWith("cookie-token", "v1");
  });

  describe("exportCsv (RF-16)", () => {
    it("extrai o token, delega para o service e envia o CSV com headers corretos", async () => {
      const { controller, analyticsService } = createController();
      const res = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      await controller.exportCsv(req, { vehicle_id: "v1", format: "csv" }, res);

      expect(analyticsService.exportCsv).toHaveBeenCalledWith("token-123", "v1");
      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/csv; charset=utf-8");
      expect(res.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        expect.stringContaining("attachment; filename=\"analytics-"),
      );
      expect(res.send).toHaveBeenCalledWith(expect.stringContaining("csv-content"));
    });
  });
});
