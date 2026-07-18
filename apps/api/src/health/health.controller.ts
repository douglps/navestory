import { Controller, Get, Inject, Logger } from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ADMIN_CLIENT } from "../shared/supabase/supabase.constants";

const SUPABASE_CHECK_TIMEOUT_MS = 3000;
const TIMEOUT_ERROR_MESSAGE = "timeout";

type SupabaseCheckErrorCode = "connection_timeout" | "query_failed";

interface SupabaseCheckResult {
  status: "ok" | "error";
  latencyMs: number;
  error?: SupabaseCheckErrorCode;
}

interface HealthCheckResponse {
  status: "ok" | "degraded" | "down";
  timestamp: string;
  checks: {
    supabase: SupabaseCheckResult;
  };
}

/**
 * @spec SPEC-20260716-002 RF-14 a RF-20
 * Verifica conectividade com o Supabase (única dependência externa crítica) a cada
 * chamada. Sempre retorna HTTP 200 — "degraded" comunica indisponibilidade da
 * dependência sem confundir monitores externos com o processo da API estar fora do ar.
 */
@Controller("health")
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(@Inject(SUPABASE_ADMIN_CLIENT) private readonly supabaseAdmin: SupabaseClient) {}

  @Get()
  async check(): Promise<HealthCheckResponse> {
    const supabase = await this.checkSupabase();
    return {
      status: supabase.status === "ok" ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      checks: { supabase },
    };
  }

  private async checkSupabase(): Promise<SupabaseCheckResult> {
    const startedAt = Date.now();
    try {
      // Ping mínimo: HEAD request sem transferência de linhas, equivalente em custo a um "SELECT 1"
      const { error } = await this.withTimeout(
        this.supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
        SUPABASE_CHECK_TIMEOUT_MS,
      );
      if (error) {
        throw new Error("query_failed");
      }
      return { status: "ok", latencyMs: Date.now() - startedAt };
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      const isTimeout = error instanceof Error && error.message === TIMEOUT_ERROR_MESSAGE;
      const errorCode: SupabaseCheckErrorCode = isTimeout ? "connection_timeout" : "query_failed";
      this.logger.warn(`Health check do Supabase: ${errorCode}`, HealthController.name);
      // RF-18/S5: nunca expõe mensagem de banco bruta — apenas os dois códigos genéricos acima
      return { status: "error", latencyMs, error: errorCode };
    }
  }

  private async withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeout = new Promise<T>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error(TIMEOUT_ERROR_MESSAGE)), ms);
    });
    try {
      return await Promise.race([Promise.resolve(promise), timeout]);
    } finally {
      clearTimeout(timer!);
    }
  }
}
