import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase autenticado como o usuário chamador (Authorization: Bearer <access_token>),
 * para que RLS (`auth.uid() = id`, regra S2) seja aplicado nativamente pelo Postgres,
 * em vez de depender apenas do filtro manual da query.
 */
export function createUserScopedClient(
  url: string,
  anonKey: string,
  accessToken: string,
): SupabaseClient {
  return createClient(url, anonKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}
