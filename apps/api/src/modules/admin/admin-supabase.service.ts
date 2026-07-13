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

  async listUsers(page: number, limit: number): Promise<{ users: unknown[]; total: number }> {
    const { data, error } = await this.client.auth.admin.listUsers({ page, perPage: limit });
    if (error) {
      throw error;
    }
    const result = data as unknown as { users: unknown[]; total?: number };
    return { users: result.users, total: result.total ?? result.users.length };
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
}
