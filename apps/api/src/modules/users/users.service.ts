import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
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
   * @spec SPEC-20260719-002 RF-01, RF-02, RF-03
   * Regra de negócio C1 (LGPD) / R-BIZ-05 (janela de 30 dias): soft-delete real — marca
   * `profiles.deleted_at`, sem chamar `auth.admin.deleteUser` (isso passa a acontecer só no
   * job de hard-delete, `hard_delete_expired_accounts()`, após 30 dias). Não há chamada
   * de revogação explícita de sessão: a GoTrue Admin API não expõe um método para invalidar
   * todas as sessões de um usuário por id (apenas por JWT de sessão ou via `deleteUser`) —
   * o bloqueio de acesso já é garantido pelo `SupabaseAuthGuard`, que rejeita toda requisição
   * autenticada assim que `deleted_at != null` (ver Notas Técnicas da spec).
   */
  async deleteAccount(userId: string): Promise<void> {
    const { data, error } = await this.supabaseAdmin
      .from("profiles")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", userId)
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      throw new NotFoundException("Conta não encontrada");
    }

    void this.auditService.log({
      userId,
      action: "ACCOUNT_DELETION_REQUESTED",
      tableName: "profiles",
      recordId: userId,
    });
  }

  /**
   * @spec SPEC-20260719-002 RF-08
   * Reverte o soft-delete dentro da janela de 30 dias. Requer `SoftDeletedUserGuard` no
   * controller (aceita token de conta com `deleted_at != null`).
   */
  async restoreAccount(userId: string): Promise<void> {
    const { data, error } = await this.supabaseAdmin
      .from("profiles")
      .update({ deleted_at: null })
      .eq("id", userId)
      .not("deleted_at", "is", null)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new NotFoundException("Conta não encontrada");
    }
    if (!data) {
      throw new ConflictException("Conta não está marcada para exclusão");
    }

    void this.auditService.log({
      userId,
      action: "ACCOUNT_RESTORED",
      tableName: "profiles",
      recordId: userId,
    });
  }
}
