import { Inject, Injectable } from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ADMIN_CLIENT } from "../../shared/supabase/supabase.constants";

/**
 * @spec SPEC-20260521-004 RF-05, CA-06
 * Wrapper dedicado ao módulo admin sobre o client SERVICE_ROLE_KEY compartilhado
 * (`shared/supabase/supabase-admin.module.ts`) — nunca reexportado para módulos
 * que atendem usuários comuns diretamente.
 */
@Injectable()
export class AdminSupabaseService {
  constructor(@Inject(SUPABASE_ADMIN_CLIENT) private readonly client: SupabaseClient) {}

  /**
   * @spec SPEC-20260731-008 RF-10
   * Enriquece a listagem bruta do GoTrue (`auth.admin.listUsers`) com `name`/`deleted_at` de
   * `profiles` — a UI admin (SPEC-20260731-008) precisa desses dois campos para exibir nome e
   * status da conta, que não existem no objeto de usuário do Supabase Auth.
   */
  async listUsers(
    page: number,
    limit: number,
  ): Promise<{
    users: Array<{
      id: string;
      email: string | null;
      name: string | null;
      role: string | null;
      deleted_at: string | null;
      created_at: string;
    }>;
    total: number;
  }> {
    const { data, error } = await this.client.auth.admin.listUsers({ page, perPage: limit });
    if (error) {
      throw error;
    }
    const result = data as unknown as {
      users: Array<{
        id: string;
        email?: string;
        app_metadata?: { role?: string };
        created_at: string;
      }>;
      total?: number;
    };

    const ids = result.users.map((user) => user.id);
    const profileById = new Map<string, { name: string | null; deleted_at: string | null }>();
    if (ids.length > 0) {
      const { data: profiles } = await this.client.from("profiles").select("id, name, deleted_at").in("id", ids);
      for (const profile of (profiles ?? []) as Array<{ id: string; name: string; deleted_at: string | null }>) {
        profileById.set(profile.id, { name: profile.name, deleted_at: profile.deleted_at });
      }
    }

    const users = result.users.map((user) => ({
      id: user.id,
      email: user.email ?? null,
      name: profileById.get(user.id)?.name ?? null,
      role: user.app_metadata?.role ?? null,
      deleted_at: profileById.get(user.id)?.deleted_at ?? null,
      created_at: user.created_at,
    }));

    return { users, total: result.total ?? users.length };
  }

  async listAuditLogs(filters: {
    userId?: string;
    from?: string;
    to?: string;
    page: number;
    limit: number;
  }) {
    let query = this.client
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (filters.userId) {
      query = query.eq("user_id", filters.userId);
    }
    if (filters.from) {
      query = query.gte("created_at", filters.from);
    }
    if (filters.to) {
      query = query.lte("created_at", filters.to);
    }

    const offset = (filters.page - 1) * filters.limit;
    const { data, error, count } = await query.range(offset, offset + filters.limit - 1);
    if (error) {
      throw error;
    }
    return { data: data ?? [], total: count ?? 0 };
  }

  async deleteUser(userId: string): Promise<void> {
    const { error } = await this.client.auth.admin.deleteUser(userId);
    if (error) {
      throw error;
    }
  }

  /**
   * @spec SPEC-20260731-008 RF-03, RF-06
   * Retorna `null` quando o usuário não existe (404 do GoTrue) para o service mapear
   * para `NotFoundException` — outros erros são propagados.
   */
  async getUserById(userId: string): Promise<{ id: string; app_metadata?: { role?: string } } | null> {
    const { data, error } = await this.client.auth.admin.getUserById(userId);
    if (error) {
      if ((error as { status?: number }).status === 404) {
        return null;
      }
      throw error;
    }
    return data.user as { id: string; app_metadata?: { role?: string } };
  }

  /**
   * @spec SPEC-20260731-008 RF-03, S12
   * `role: undefined` remove a chave em vez de sobrescrever `app_metadata` inteiro (merge do GoTrue).
   */
  async updateUserRole(userId: string, role: "admin" | null): Promise<void> {
    const { error } = await this.client.auth.admin.updateUserById(userId, {
      app_metadata: { role: role ?? undefined },
    });
    if (error) {
      throw error;
    }
  }
}
