"use client";

import type { FuelStats } from "@navestory/validators";
import { Badge } from "@navestory/ui";
import type { ReactNode } from "react";
import {
  computeFuelRealtimeIndicators,
  formatKmPerLiter,
} from "@/lib/fuel-realtime-calc";

export interface FuelRealtimeIndicatorsProps {
  amount: number | undefined;
  liters: number | undefined;
  fullTank: boolean | null;
  odometerKm: number | undefined;
  historicalStats: FuelStats | null | undefined;
}

/**
 * @spec SPEC-20260814-002 RF-02, RF-05, RF-06, RF-07, RF-08, RF-09, RF-11, RNF-05, RNF-06
 * Só é renderizado pelo formulário quando `category === 'fuel'` (RF-11, decisão do chamador).
 * `aria-live="polite"` (RNF-06): nunca `assertive` — não deve interromper a digitação.
 * Nota: RF-01 (price_per_liter em tempo real) é coberto pelo campo editável "Valor por litro"
 * via `useFuelCrossCalc` (SPEC-20260612-001 RF-05.2). Este componente não duplica esse valor;
 * cobre apenas km/L, detecção de anomalia vs. histórico e avisos de gap silencioso.
 */
export function FuelRealtimeIndicators({
  amount,
  liters,
  fullTank,
  odometerKm,
  historicalStats,
}: FuelRealtimeIndicatorsProps): ReactNode {
  const indicators = computeFuelRealtimeIndicators({
    amount,
    liters,
    fullTank,
    odometerKm,
    historicalStats,
  });

  const formattedKm = formatKmPerLiter(indicators.kmPerLiter);

  const showKmDash =
    fullTank === true && liters != null && liters > 0 && odometerKm != null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col gap-1 text-xs text-muted-foreground"
    >
      <div className="flex flex-wrap items-center gap-2">
        {showKmDash && (
          <span>
            {formattedKm ?? "—"}
            {indicators.kmPerLiterUnavailableReason === "no-history" && (
              <span> · Histórico insuficiente para calcular consumo</span>
            )}
          </span>
        )}
      </div>

      {indicators.priceAnomalyMessage && (
        <Badge variant="warning">{indicators.priceAnomalyMessage}</Badge>
      )}
      {indicators.kmAnomalyMessage && (
        <Badge variant="warning">{indicators.kmAnomalyMessage}</Badge>
      )}
      {indicators.missingLitersNotice && (
        <p>{indicators.missingLitersNotice}</p>
      )}
      {indicators.missingFullTankNotice && (
        <p>{indicators.missingFullTankNotice}</p>
      )}
    </div>
  );
}
