import { describe, expect, it } from "vitest";
import {
  exportExpensesQuerySchema,
  fleetKpisQuerySchema,
  vehicleHistoryQuerySchema,
} from "./dashboard.schemas";

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
