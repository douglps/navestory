import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createUserScopedClient } from "../../shared/supabase/create-user-scoped-client";

export interface AuditLogRow {
  id: string;
  action: string;
  table_name: string;
  record_id: string;
  changes: Record<string, unknown>;
  created_at: string;
}

const MAX_ENTRIES = 100;

/**
 * Campos nunca expostos na coluna "Detalhes" da página, mesmo que gravados por engano
 * em `changes` (defesa em profundidade além de R-MON-02).
 */
const SENSITIVE_CHANGE_FIELDS = [
  "user_id",
  "deleted_at",
  "photo_url",
  "photo_thumbnail_url",
  "access_token",
  "token",
];

/**
 * @spec SPEC-20260602-005 RF-09, RF-10
 */
@Injectable()
export class AuditLogsService {
  constructor(private readonly configService: ConfigService) {}

  private clientForUser(accessToken: string): SupabaseClient {
    return createUserScopedClient(
      this.configService.getOrThrow<string>("SUPABASE_URL"),
      this.configService.getOrThrow<string>("SUPABASE_ANON_KEY"),
      accessToken,
    );
  }

  /**
   * @spec SPEC-20260602-005 RF-06, RF-10
   * valida R-MON-02
   */
  async findRecent(accessToken: string, userId: string): Promise<AuditLogRow[]> {
    const { data, error } = await this.clientForUser(accessToken)
      .from("audit_logs")
      .select("id, action, table_name, record_id, changes, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(MAX_ENTRIES);

    if (error) {
      throw new BadRequestException("Não foi possível carregar o histórico de atividades");
    }

    return ((data ?? []) as AuditLogRow[]).map((row) => ({
      ...row,
      changes: this.stripSensitiveFields(row.changes ?? {}),
    }));
  }

  private stripSensitiveFields(changes: Record<string, unknown>): Record<string, unknown> {
    const filtered = { ...changes };
    for (const field of SENSITIVE_CHANGE_FIELDS) {
      // eslint-disable-next-line security/detect-object-injection -- field vem de lista fixa (SENSITIVE_CHANGE_FIELDS), não de input externo
      delete filtered[field];
    }
    return filtered;
  }
}
