"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { apiClient } from "@/lib/http/api-client";
import { usePreferences, type UserPreferencesResponse } from "@/lib/hooks/use-preferences";

/**
 * @spec SPEC-20260715-002 RF-FE-01, RNF-04, R-TZ-02
 * Detecção automática e silenciosa (sem modal) de `Intl.DateTimeFormat().resolvedOptions().timeZone`
 * no primeiro acesso de um usuário sem `timezone` configurado. Não renderiza UI — mesmo padrão do
 * `VehicleActivator` (efeito puro, sem elemento visual).
 */
export function TimezoneDetector(): null {
  const hasAttempted = useRef(false);
  const queryClient = useQueryClient();
  const { data: preferences, isLoading } = usePreferences();

  const mutation = useMutation({
    mutationFn: (timezone: string) =>
      apiClient<UserPreferencesResponse>("/preferences", { method: "PATCH", body: { timezone } }),
    onSuccess: (data) => {
      queryClient.setQueryData(["preferences"], data);
    },
  });

  useEffect(() => {
    if (hasAttempted.current || isLoading || !preferences || preferences.timezone != null) return;
    hasAttempted.current = true;

    // RNF-04: valor não-IANA (edge case em browsers antigos) — omite o PATCH silenciosamente,
    // o fallback 'UTC' do backend assume a partir daqui.
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!detected || !/^[A-Za-z_/]+$/.test(detected)) return;

    mutation.mutate(detected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, preferences]);

  return null;
}
