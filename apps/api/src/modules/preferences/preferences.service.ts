import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DEFAULT_AUTO_DRAFT_ENABLED } from "@nave/validators";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createUserScopedClient } from "../../shared/supabase/create-user-scoped-client";
import type { UpdatePreferencesDto } from "./dto/update-preferences.dto";

/**
 * @spec SPEC-20260612-003
 */
@Injectable()
export class PreferencesService {
  constructor(private readonly configService: ConfigService) {}

  private clientForUser(accessToken: string): SupabaseClient {
    return createUserScopedClient(
      this.configService.getOrThrow<string>("SUPABASE_URL"),
      this.configService.getOrThrow<string>("SUPABASE_ANON_KEY"),
      accessToken,
    );
  }

  /**
   * @spec SPEC-20260612-003 RF-01.3 — fallback para default quando ausente (R-PREF-01)
   */
  async findOne(accessToken: string, userId: string): Promise<{ auto_draft_enabled: boolean }> {
    const { data, error } = await this.clientForUser(accessToken)
      .from("user_preferences")
      .select("auto_draft_enabled")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new NotFoundException("Não foi possível carregar as preferências");
    }

    const row = data as { auto_draft_enabled: boolean } | null;
    return { auto_draft_enabled: row?.auto_draft_enabled ?? DEFAULT_AUTO_DRAFT_ENABLED };
  }

  /**
   * @spec SPEC-20260612-003 RF-01.3 — upsert idempotente por user_id
   */
  async upsert(
    accessToken: string,
    userId: string,
    dto: UpdatePreferencesDto,
  ): Promise<{ auto_draft_enabled: boolean }> {
    const { data, error } = await this.clientForUser(accessToken)
      .from("user_preferences")
      .upsert({ user_id: userId, ...dto }, { onConflict: "user_id" })
      .select("auto_draft_enabled")
      .single();

    if (error) {
      throw new NotFoundException("Não foi possível salvar as preferências");
    }

    return data as { auto_draft_enabled: boolean };
  }
}
