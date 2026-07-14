import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DEFAULT_AUTO_DRAFT_ENABLED, DEFAULT_CHIP_FIELDS, type ChipField } from "@nave/validators";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createUserScopedClient } from "../../shared/supabase/create-user-scoped-client";
import type { UpdatePreferencesDto } from "./dto/update-preferences.dto";

type PreferencesResponse = { auto_draft_enabled: boolean; vehicle_chip_fields: ChipField[] };

const PREFERENCES_COLUMNS = "auto_draft_enabled, vehicle_chip_fields";

/**
 * @spec SPEC-20260612-003
 * @spec SPEC-20260603-003 RF-06
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
   * @spec SPEC-20260603-003 RF-06 — fallback de vehicle_chip_fields (R-DISP-03)
   */
  async findOne(accessToken: string, userId: string): Promise<PreferencesResponse> {
    const { data, error } = await this.clientForUser(accessToken)
      .from("user_preferences")
      .select(PREFERENCES_COLUMNS)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new NotFoundException("Não foi possível carregar as preferências");
    }

    const row = data as PreferencesResponse | null;
    return {
      auto_draft_enabled: row?.auto_draft_enabled ?? DEFAULT_AUTO_DRAFT_ENABLED,
      vehicle_chip_fields: row?.vehicle_chip_fields ?? DEFAULT_CHIP_FIELDS,
    };
  }

  /**
   * @spec SPEC-20260612-003 RF-01.3 — upsert idempotente por user_id
   * @spec SPEC-20260603-003 RF-06 — updateChipFields via upsert parcial
   */
  async upsert(
    accessToken: string,
    userId: string,
    dto: UpdatePreferencesDto,
  ): Promise<PreferencesResponse> {
    const { data, error } = await this.clientForUser(accessToken)
      .from("user_preferences")
      .upsert({ user_id: userId, ...dto }, { onConflict: "user_id" })
      .select(PREFERENCES_COLUMNS)
      .single();

    if (error) {
      throw new NotFoundException("Não foi possível salvar as preferências");
    }

    return data as PreferencesResponse;
  }
}
