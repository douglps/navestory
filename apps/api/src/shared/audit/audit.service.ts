import { Inject, Injectable, Logger } from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentRequestId } from "../../common/context/request-context";
import { SUPABASE_CLIENT } from "../supabase/supabase.constants";

export interface AuditLogEntry {
  userId: string | null;
  action: string;
  tableName: string;
  recordId: string;
  changes?: Record<string, unknown>;
}

/**
 * @spec SPEC-20260521-001 RF-SEC-002
 * Insert fire-and-forget: nunca propaga exceção (R-MON-01) — falha vira apenas log de erro.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      // @spec SPEC-20260602-005 RF-07 — correlação com logs Pino/Sentry via requestId
      const requestId = getCurrentRequestId();
      const changes = requestId ? { ...entry.changes, requestId } : (entry.changes ?? {});
      const { error } = await this.supabase.from("audit_logs").insert({
        user_id: entry.userId,
        action: entry.action,
        table_name: entry.tableName,
        record_id: entry.recordId,
        changes,
      });
      if (error) {
        this.logger.error(`Falha ao gravar audit_log: ${error.message}`);
      }
    } catch (err) {
      this.logger.error(`Falha ao gravar audit_log: ${(err as Error).message}`);
    }
  }
}
