import { describe, expect, it } from "vitest";
import {
  anomaliesQuerySchema,
  exportAnalyticsQuerySchema,
  forecastQuerySchema,
  fuelTrendQuerySchema,
  insightsQuerySchema,
  seasonalQuerySchema,
} from "./analytics.schemas";

describe("fuelTrendQuerySchema", () => {
  it("aplica default de limit=20 quando ausente", () => {
    const result = fuelTrendQuerySchema.parse({});
    expect(result.limit).toBe(20);
  });

  it("aceita limit dentro do intervalo 1-100", () => {
    expect(fuelTrendQuerySchema.safeParse({ limit: "1" }).success).toBe(true);
    expect(fuelTrendQuerySchema.safeParse({ limit: "100" }).success).toBe(true);
  });

  it("rejeita limit fora do intervalo 1-100", () => {
    expect(fuelTrendQuerySchema.safeParse({ limit: "0" }).success).toBe(false);
    expect(fuelTrendQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
  });
});

describe("anomaliesQuerySchema", () => {
  it("aplica default de threshold=2.0 quando ausente", () => {
    expect(anomaliesQuerySchema.parse({}).threshold).toBe(2.0);
  });

  it("rejeita threshold fora do intervalo 1.5-4.0 (R-ANA-02)", () => {
    expect(anomaliesQuerySchema.safeParse({ threshold: "1.4" }).success).toBe(false);
    expect(anomaliesQuerySchema.safeParse({ threshold: "4.1" }).success).toBe(false);
  });

  it("rejeita vehicle_id que não é UUID", () => {
    expect(anomaliesQuerySchema.safeParse({ vehicle_id: "abc" }).success).toBe(false);
  });
});

describe("forecastQuerySchema", () => {
  it("aplica default de months=3 quando ausente", () => {
    expect(forecastQuerySchema.parse({}).months).toBe(3);
  });

  it("rejeita months fora do intervalo 1-12 (R-ANA-03)", () => {
    expect(forecastQuerySchema.safeParse({ months: "0" }).success).toBe(false);
    expect(forecastQuerySchema.safeParse({ months: "13" }).success).toBe(false);
  });
});

describe("seasonalQuerySchema", () => {
  it("aceita vehicle_id ausente ou UUID válido", () => {
    expect(seasonalQuerySchema.safeParse({}).success).toBe(true);
    expect(
      seasonalQuerySchema.safeParse({ vehicle_id: "550e8400-e29b-41d4-a716-446655440000" })
        .success,
    ).toBe(true);
  });
});

describe("insightsQuerySchema", () => {
  it("rejeita vehicle_id que não é UUID (RF-14)", () => {
    expect(insightsQuerySchema.safeParse({ vehicle_id: "abc" }).success).toBe(false);
  });
});

describe("exportAnalyticsQuerySchema", () => {
  it("aplica default de format=csv (RF-16)", () => {
    expect(exportAnalyticsQuerySchema.parse({}).format).toBe("csv");
  });

  it("rejeita format diferente de csv", () => {
    expect(exportAnalyticsQuerySchema.safeParse({ format: "xlsx" }).success).toBe(false);
  });
});
