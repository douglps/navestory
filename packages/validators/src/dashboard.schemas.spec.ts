import { describe, expect, it } from "vitest";
import {
  DEFAULT_DASHBOARD_KPI_IDS,
  DEFAULT_SPENDING_WINDOW_DAYS,
  KPI_CATALOG_IDS,
  MAX_ACTIVE_DASHBOARD_KPIS,
  SPENDING_WINDOW_DAYS_OPTIONS,
  dashboardKpiIdsSchema,
  exportExpensesQuerySchema,
  fleetKpisQuerySchema,
  spendingWindowDaysSchema,
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

  it("KPI_CATALOG_IDS inclui spending_window como 9ª entrada (SPEC-20260804-001 RF-06)", () => {
    expect(KPI_CATALOG_IDS).toHaveLength(9);
    expect(KPI_CATALOG_IDS).toContain("spending_window");
  });
});

describe("spendingWindowDaysSchema (SPEC-20260804-001 RF-01, RF-02, R-KPI-03)", () => {
  it("aceita os 3 valores permitidos: 7, 14, 30", () => {
    for (const days of SPENDING_WINDOW_DAYS_OPTIONS) {
      expect(spendingWindowDaysSchema.safeParse(days).success).toBe(true);
    }
  });

  it("rejeita valor fora do conjunto fechado {7, 14, 30}", () => {
    expect(spendingWindowDaysSchema.safeParse(10).success).toBe(false);
    expect(spendingWindowDaysSchema.safeParse(0).success).toBe(false);
    expect(spendingWindowDaysSchema.safeParse(60).success).toBe(false);
  });

  it("rejeita valor não numérico", () => {
    expect(spendingWindowDaysSchema.safeParse("7").success).toBe(false);
  });

  it("aplica default de 7 dias quando ausente (R-PREF-01)", () => {
    const result = spendingWindowDaysSchema.safeParse(undefined);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe(7);
  });

  it("DEFAULT_SPENDING_WINDOW_DAYS é 7", () => {
    expect(DEFAULT_SPENDING_WINDOW_DAYS).toBe(7);
  });

  it("SPENDING_WINDOW_DAYS_OPTIONS é [7, 14, 30]", () => {
    expect(SPENDING_WINDOW_DAYS_OPTIONS).toEqual([7, 14, 30]);
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
