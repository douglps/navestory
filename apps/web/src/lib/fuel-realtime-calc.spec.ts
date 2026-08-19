import { describe, expect, it } from "vitest";
import {
  computeFuelRealtimeIndicators,
  computeKmPerLiter,
  computeMissingFullTankNotice,
  computeMissingLitersNotice,
  computePricePerLiter,
  formatKmPerLiter,
  formatPricePerLiter,
} from "./fuel-realtime-calc";

// @spec SPEC-20260814-002 RF-01, RF-02, RF-05, RF-06, RF-07, RF-08, R-FUEL-10, R-FUEL-11, R-FUEL-12
describe("fuel-realtime-calc", () => {
  describe("computePricePerLiter (RF-01, US-01)", () => {
    it("calcula amount / liters quando liters > 0", () => {
      expect(computePricePerLiter(150, 50)).toBe(3);
    });

    it("retorna null quando liters está vazio ou zero", () => {
      expect(computePricePerLiter(150, undefined)).toBeNull();
      expect(computePricePerLiter(150, 0)).toBeNull();
    });

    it("retorna null quando amount está vazio", () => {
      expect(computePricePerLiter(undefined, 50)).toBeNull();
    });
  });

  describe("computeKmPerLiter (RF-02, US-02)", () => {
    it("calcula quando full_tank=true, liters>0 e odômetro anterior disponível", () => {
      const result = computeKmPerLiter(true, 50, 46100, 45230);
      expect(result).toEqual({ value: 17.4, unavailableReason: null });
    });

    it("retorna — sem aviso quando full_tank não é true", () => {
      expect(computeKmPerLiter(false, 50, 46100, 45230)).toEqual({
        value: null,
        unavailableReason: null,
      });
      expect(computeKmPerLiter(null, 50, 46100, 45230)).toEqual({
        value: null,
        unavailableReason: null,
      });
    });

    it("retorna — sem aviso quando liters não está preenchido (usuário ainda digitando)", () => {
      expect(computeKmPerLiter(true, undefined, 46100, 45230)).toEqual({
        value: null,
        unavailableReason: null,
      });
    });

    it("retorna — com aviso de histórico insuficiente quando não há odômetro anterior", () => {
      expect(computeKmPerLiter(true, 50, 46100, null)).toEqual({
        value: null,
        unavailableReason: "no-history",
      });
    });

    it("retorna — sem aviso quando odômetro digitado é menor ou igual ao anterior", () => {
      expect(computeKmPerLiter(true, 50, 45000, 45230)).toEqual({
        value: null,
        unavailableReason: null,
      });
      expect(computeKmPerLiter(true, 50, 45230, 45230)).toEqual({
        value: null,
        unavailableReason: null,
      });
    });
  });

  describe("computeMissingLitersNotice / computeMissingFullTankNotice (RF-07, RF-08, R-FUEL-12)", () => {
    it("avisa quando liters está vazio", () => {
      expect(computeMissingLitersNotice(undefined)).toMatch(/litros/);
      expect(computeMissingLitersNotice(0)).toMatch(/litros/);
    });

    it("não avisa quando liters está preenchido", () => {
      expect(computeMissingLitersNotice(40)).toBeNull();
    });

    it("avisa para marcar tanque cheio quando liters preenchido mas full_tank != true", () => {
      expect(computeMissingFullTankNotice(40, null)).toMatch(/Tanque cheio/);
      expect(computeMissingFullTankNotice(40, false)).toMatch(/Tanque cheio/);
    });

    it("não avisa quando full_tank=true ou liters vazio", () => {
      expect(computeMissingFullTankNotice(40, true)).toBeNull();
      expect(computeMissingFullTankNotice(undefined, false)).toBeNull();
    });
  });

  describe("computeFuelRealtimeIndicators (RF-05, RF-06, US-03)", () => {
    it("emite aviso quando preço diverge mais de 50% da média histórica", () => {
      const result = computeFuelRealtimeIndicators({
        amount: 600,
        liters: 50,
        fullTank: null,
        odometerKm: undefined,
        historicalStats: {
          avg_price_per_liter: 6,
          avg_km_per_liter: null,
          record_count: 5,
          last_odometer_km: 45230,
        },
      });

      expect(result.pricePerLiter).toBe(12);
      expect(result.priceAnomalyMessage).toMatch(/acima do histórico/);
    });

    it("não emite aviso quando divergência está dentro do limiar de 50%", () => {
      const result = computeFuelRealtimeIndicators({
        amount: 300,
        liters: 50,
        fullTank: null,
        odometerKm: undefined,
        historicalStats: {
          avg_price_per_liter: 6,
          avg_km_per_liter: null,
          record_count: 5,
          last_odometer_km: 45230,
        },
      });

      expect(result.pricePerLiter).toBe(6);
      expect(result.priceAnomalyMessage).toBeNull();
    });

    it("não emite aviso quando historicalStats é null (amostra insuficiente, R-FUEL-11)", () => {
      const result = computeFuelRealtimeIndicators({
        amount: 600,
        liters: 50,
        fullTank: null,
        odometerKm: undefined,
        historicalStats: null,
      });

      expect(result.priceAnomalyMessage).toBeNull();
      expect(result.kmAnomalyMessage).toBeNull();
    });

    it("emite aviso de consumo divergente e nenhum gap notice quando tudo preenchido", () => {
      const result = computeFuelRealtimeIndicators({
        amount: 200,
        liters: 40,
        fullTank: true,
        odometerKm: 46100,
        historicalStats: {
          avg_price_per_liter: 5,
          avg_km_per_liter: 5,
          record_count: 4,
          last_odometer_km: 45230,
        },
      });

      // km/L = (46100-45230)/40 = 21.75 -> diverge > 50% de 5
      expect(result.kmPerLiter).toBe(21.8);
      expect(result.kmAnomalyMessage).toMatch(/Consumo muito acima/);
      expect(result.missingLitersNotice).toBeNull();
      expect(result.missingFullTankNotice).toBeNull();
    });
  });

  describe("formatters (RNF-04)", () => {
    it("formata preço por litro em BRL com sufixo /L", () => {
      expect(formatPricePerLiter(3.567)).toBe("R$ 3,57/L");
    });

    it("formata km/L com 1 casa decimal", () => {
      expect(formatKmPerLiter(17.44)).toBe("17,4 km/L");
    });

    it("retorna null quando o valor é null", () => {
      expect(formatPricePerLiter(null)).toBeNull();
      expect(formatKmPerLiter(null)).toBeNull();
    });
  });
});
