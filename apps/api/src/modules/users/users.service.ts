import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AuditService } from "../../shared/audit/audit.service";
import { createUserScopedClient } from "../../shared/supabase/create-user-scoped-client";
import { SUPABASE_ADMIN_CLIENT } from "../../shared/supabase/supabase.constants";
import type { UpdateProfileDto } from "./dto/update-profile.dto";

export interface Profile {
  id: string;
  name: string;
  profile_type: string;
  preferences: Record<string, unknown>;
}

/**
 * @spec SPEC-20260521-004
 */
@Injectable()
export class UsersService {
  constructor(
    @Inject(SUPABASE_ADMIN_CLIENT) private readonly supabaseAdmin: SupabaseClient,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  private clientForUser(accessToken: string): SupabaseClient {
    return createUserScopedClient(
      this.configService.getOrThrow<string>("SUPABASE_URL"),
      this.configService.getOrThrow<string>("SUPABASE_ANON_KEY"),
      accessToken,
    );
  }

  async getProfile(accessToken: string, userId: string): Promise<Profile> {
    const { data, error } = await this.clientForUser(accessToken)
      .from("profiles")
      .select("id, name, profile_type, preferences")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) {
      throw new NotFoundException("Perfil não encontrado");
    }
    return data as Profile;
  }

  async updateProfile(
    accessToken: string,
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<Profile> {
    const { data, error } = await this.clientForUser(accessToken)
      .from("profiles")
      .update(dto)
      .eq("id", userId)
      .select("id, name, profile_type, preferences")
      .single();

    if (error || !data) {
      throw new NotFoundException("Perfil não encontrado");
    }
    return data as Profile;
  }

  /**
   * @spec SPEC-20260521-004 RF-01, RF-02, RF-03
   * Regra de negócio C1 (LGPD): exclusão completa via cascata (`ON DELETE CASCADE` a partir
   * de auth.users), não retenção anonimizada — o `auth.admin.deleteUser` já revoga todos
   * os JWTs emitidos para o usuário.
   */
  async deleteAccount(userId: string): Promise<void> {
    const { error } = await this.supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) {
      throw new NotFoundException("Conta não encontrada");
    }

    void this.auditService.log({
      userId,
      action: "ACCOUNT_DELETED",
      tableName: "profiles",
      recordId: userId,
    });
  }
}
