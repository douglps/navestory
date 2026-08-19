"use client";

import type { FuelStats } from "@navestory/validators";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { apiClient } from "@/lib/http/api-client";

/**
 * @spec SPEC-20260814-002 RF-04, RF-10, RF-11, RNF-02, RNF-03
 * Carregado uma única vez no mount do formulário (chave inclui `vehicleId`, então troca de
 * veículo dispara nova busca — não digitação). `retry: false` + consumo silencioso de erro
 * (RF-10, fire-and-forget): o chamador trata `data === undefined` exatamente como "sem
 * histórico ainda", sem exibir erro ao usuário.
 */
export function useFuelHistoricalStats(
  vehicleId: string,
  enabled: boolean,
): UseQueryResult<FuelStats> {
  return useQuery({
    queryKey: ["expenses", "fuel-stats", vehicleId],
    queryFn: () =>
      apiClient<FuelStats>(
        `/expenses/fuel-stats?vehicle_id=${encodeURIComponent(vehicleId)}`,
      ),
    enabled: enabled && vehicleId !== "",
    retry: false,
  });
}
