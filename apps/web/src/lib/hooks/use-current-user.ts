import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { apiClient } from "@/lib/http/api-client";

export interface CurrentUserProfile {
  id: string;
  name: string;
  email: string | null;
}

/**
 * @spec SPEC-20260730-002 RF-05 — `queryKey: ["users", "me"]` compartilhada com
 * `settings/account/page.tsx`; o TanStack Query dedupe automaticamente a chamada quando
 * ambos consomem o cache na mesma navegação, evitando request exclusiva para o header.
 */
export function useCurrentUser(): UseQueryResult<CurrentUserProfile> {
  return useQuery({
    queryKey: ["users", "me"],
    queryFn: () => apiClient<CurrentUserProfile>("/users/me"),
    retry: false,
  });
}
