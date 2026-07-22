import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/http/api-client";

export interface UserPreferencesResponse {
  auto_draft_enabled: boolean;
  vehicle_chip_fields?: string[];
  dashboard_kpi_ids?: string[];
  timezone: string | null;
}

/**
 * @spec SPEC-20260715-002 RF-FE-03, RF-FE-04
 * Ponto único de leitura de `user_preferences` no frontend — evita repetir o mesmo
 * `useQuery(["preferences"], ...)` em cada formulário/página que precisa do fuso do usuário.
 */
export function usePreferences() {
  return useQuery({
    queryKey: ["preferences"],
    queryFn: () => apiClient<UserPreferencesResponse>("/preferences"),
    retry: false,
  });
}
