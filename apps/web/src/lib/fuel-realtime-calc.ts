import type { FuelStats } from "@navestory/validators";

/**
 * @spec SPEC-20260814-002 RF-01, RF-02, RF-05, RF-06, RF-07, RF-08, RF-09, RF-10, RF-11
 * Espelho client-side de `computeFuelMetrics` (SPEC-20260606-001 R-FUEL-02, R-FUEL-03) — cálculo
 * puro, sem I/O, para reaproveitar em testes de unidade sem montar o componente React (RNF-01:
 * < 1ms, operação aritmética pura). `historicalStats` é carregado uma única vez no mount via
 * `GET /expenses/fuel-stats` (RF-04) e nunca refeito durante a digitação.
 */

const ANOMALY_THRESHOLD = 0.5;

export interface FuelRealtimeInputs {
  amount: number | undefined;
  liters: number | undefined;
  fullTank: boolean | null;
  odometerKm: number | undefined;
  /** @spec RF-03 — reaproveitado de `FuelStats.last_odometer_km`, não de uma nova chamada. */
  historicalStats: FuelStats | null | undefined;
}

export interface FuelRealtimeOutputs {
  pricePerLiter: number | null;
  kmPerLiter: number | null;
  /** @spec US-02 AC-4 — "Histórico insuficiente para calcular consumo" */
  kmPerLiterUnavailableReason: "no-history" | null;
  priceAnomalyMessage: string | null;
  kmAnomalyMessage: string | null;
  /** @spec R-FUEL-12, RF-07 */
  missingLitersNotice: string | null;
  /** @spec R-FUEL-12, RF-08 */
  missingFullTankNotice: string | null;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function hasPositiveLiters(liters: number | undefined): liters is number {
  return liters != null && liters > 0;
}

/** @spec RF-01 */
export function computePricePerLiter(
  amount: number | undefined,
  liters: number | undefined,
): number | null {
  if (!hasPositiveLiters(liters) || amount == null) return null;
  return round2(amount / liters);
}

/** @spec RF-02, US-02 AC-1..4 */
export function computeKmPerLiter(
  fullTank: boolean | null,
  liters: number | undefined,
  odometerKm: number | undefined,
  lastOdometerKm: number | null | undefined,
): { value: number | null; unavailableReason: "no-history" | null } {
  if (fullTank !== true || !hasPositiveLiters(liters) || odometerKm == null) {
    return { value: null, unavailableReason: null };
  }
  if (lastOdometerKm == null) {
    return { value: null, unavailableReason: "no-history" };
  }
  if (odometerKm <= lastOdometerKm) {
    return { value: null, unavailableReason: null };
  }
  return {
    value: round1((odometerKm - lastOdometerKm) / liters),
    unavailableReason: null,
  };
}

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** @spec RF-05, RF-06, R-FUEL-11 */
function computeAnomalyMessage(
  value: number | null,
  average: number | null | undefined,
  label: string,
  formatAverage: (value: number) => string,
): string | null {
  if (value == null || average == null || average === 0) return null;
  const divergence = Math.abs(value - average) / average;
  if (divergence <= ANOMALY_THRESHOLD) return null;
  const direction = value > average ? "acima" : "abaixo";
  return `${label} muito ${direction} do histórico (média: ${formatAverage(average)})`;
}

/** @spec RF-07 */
export function computeMissingLitersNotice(
  liters: number | undefined,
): string | null {
  return hasPositiveLiters(liters)
    ? null
    : "Preencha os litros para calcular preço/litro e consumo.";
}

/** @spec RF-08 */
export function computeMissingFullTankNotice(
  liters: number | undefined,
  fullTank: boolean | null,
): string | null {
  if (!hasPositiveLiters(liters) || fullTank === true) return null;
  return 'Marque "Tanque cheio" para que o consumo (km/L) seja calculado e registrado.';
}

/** @spec RF-01, RF-02, RF-05, RF-06, RF-07, RF-08 — combina todos os indicadores de uma vez */
export function computeFuelRealtimeIndicators(
  inputs: FuelRealtimeInputs,
): FuelRealtimeOutputs {
  const { amount, liters, fullTank, odometerKm, historicalStats } = inputs;

  const pricePerLiter = computePricePerLiter(amount, liters);
  const { value: kmPerLiter, unavailableReason: kmPerLiterUnavailableReason } =
    computeKmPerLiter(
      fullTank,
      liters,
      odometerKm,
      historicalStats?.last_odometer_km,
    );

  return {
    pricePerLiter,
    kmPerLiter,
    kmPerLiterUnavailableReason,
    priceAnomalyMessage: computeAnomalyMessage(
      pricePerLiter,
      historicalStats?.avg_price_per_liter,
      "Preço",
      (value) => `${brl.format(value)}/L`,
    ),
    kmAnomalyMessage: computeAnomalyMessage(
      kmPerLiter,
      historicalStats?.avg_km_per_liter,
      "Consumo",
      (value) => `${value.toFixed(1)} km/L`,
    ),
    missingLitersNotice: computeMissingLitersNotice(liters),
    missingFullTankNotice: computeMissingFullTankNotice(liters, fullTank),
  };
}

/** @spec RNF-04 */
export function formatPricePerLiter(value: number | null): string | null {
  return value == null ? null : `${brl.format(value)}/L`;
}

/** @spec RNF-04 */
const kmPerLiterFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatKmPerLiter(value: number | null): string | null {
  return value == null ? null : `${kmPerLiterFormatter.format(value)} km/L`;
}
