import { describe, expect, it } from "vitest";
import {
  DEFAULT_DASHBOARD_KPI_IDS,
  KPI_CATALOG_IDS,
  MAX_ACTIVE_DASHBOARD_KPIS,
  dashboardKpiIdsSchema,
  exportExpensesQuerySchema,
  fleetKpisQuerySchema,
  vehicleHistoryQuerySchema,
} from "./dashboard.schemas";

describe("dashboardKpiIdsSchema (SPEC-20260721-002 RF-01, R-KPI-01)", () => {
  it("aceita 1 id do catálogo", () => {
    expect(dashboardKpiIdsSchema.safeParse(["expenses_month"]).success).toBe(true);
  });

  it("aceita o teto de 6 ids ativos", () => {
    const result = dashboardKpiIdsSchema.safeParse(KPI_CATALOG_IDS.slice(0, 6));
    expect(result.success).toBe(true);
  });

  it("rejeita mais de 6 ids ativos (R-KPI-01)", () => {
    const result = dashboardKpiIdsSchema.safeParse(KPI_CATALOG_IDS.slice(0, 7));
    expect(result.success).toBe(false);
  });

  it("rejeita array vazio", () => {
    expect(dashboardKpiIdsSchema.safeParse([]).success).toBe(false);
  });

  it("rejeita id fora do catálogo fixo", () => {
    expect(dashboardKpiIdsSchema.safeParse(["metrica_inventada"]).success).toBe(false);
  });

  it("rejeita id repetido", () => {
    expect(dashboardKpiIdsSchema.safeParse(["expenses_month", "expenses_month"]).success).toBe(false);
  });

  it("MAX_ACTIVE_DASHBOARD_KPIS é 6", () => {
    expect(MAX_ACTIVE_DASHBOARD_KPIS).toBe(6);
  });

  it("DEFAULT_DASHBOARD_KPI_IDS preserva os 4 KPIs já exibidos antes desta feature", () => {
    expect(DEFAULT_DASHBOARD_KPI_IDS).toEqual([
      "expenses_month",
      "urgent_maintenance",
      "cost_per_km",
      "next_maintenance",
    ]);
    expect(dashboardKpiIdsSchema.safeParse(DEFAULT_DASHBOARD_KPI_IDS).success).toBe(true);
  });
});

describe("exportExpensesQuerySchema", () => {
  it("aceita period no formato YYYY-MM (RF-02, RF-03)", () => {
    expect(exportExpensesQuerySchema.safeParse({ period: "2026-07" }).success).toBe(true);
  });

  it("rejeita period fora do formato YYYY-MM", () => {
    expect(exportExpensesQuerySchema.safeParse({ period: "2026-13" }).success).toBe(false);
    expect(exportExpensesQuerySchema.safeParse({ period: "07-2026" }).success).toBe(false);
    expect(exportExpensesQuerySchema.safeParse({ period: "" }).success).toBe(false);
  });

  it("rejeita vehicle_id que não é UUID", () => {
    expect(
      exportExpensesQuerySchema.safeParse({ period: "2026-07", vehicle_id: "abc" }).success,
    ).toBe(false);
  });
});

describe("fleetKpisQuerySchema", () => {
  it("aceita vehicle_id ausente (RF-DA-03: KPIs de frota não recortam por veículo)", () => {
    expect(fleetKpisQuerySchema.safeParse({}).success).toBe(true);
  });

  it("rejeita vehicle_id que não é UUID", () => {
    expect(fleetKpisQuerySchema.safeParse({ vehicle_id: "abc" }).success).toBe(false);
  });
});

describe("vehicleHistoryQuerySchema", () => {
  it("exige vehicle_id como UUID válido (RF-DB-07)", () => {
    expect(
      vehicleHistoryQuerySchema.safeParse({ vehicle_id: "550e8400-e29b-41d4-a716-446655440000" })
        .success,
    ).toBe(true);
  });

  it("rejeita ausência de vehicle_id", () => {
    expect(vehicleHistoryQuerySchema.safeParse({}).success).toBe(false);
  });

  it("rejeita vehicle_id que não é UUID", () => {
    expect(vehicleHistoryQuerySchema.safeParse({ vehicle_id: "abc" }).success).toBe(false);
  });
});
