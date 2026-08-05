import { Inject, Injectable } from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ADMIN_CLIENT } from "../../../shared/supabase/supabase.constants";

type WorkspaceRole = "workspace_owner" | "workspace_member";

/**
 * @spec specs/workspace/SPEC-20260804-004-workspace-foundation.md — wrapper dedicado ao módulo
 * workspaces sobre o client SERVICE_ROLE_KEY compartilhado (mesmo padrão de
 * `apps/api/src/modules/admin/admin-supabase.service.ts`) — nunca reexportado para módulos que
 * atendem usuários comuns diretamente. Usado apenas para (1) escrever `app_metadata.role`
 * (S12, não editável via client user-scoped) e (2) o fluxo de aceite de convite, que é
 * necessariamente cross-user: o convidado ainda não tem nenhuma relação de posse RLS com o
 * workspace até a própria operação de aceite criar essa relação.
 */
@Injectable()
export class WorkspaceAdminSupabaseService {
  constructor(@Inject(SUPABASE_ADMIN_CLIENT) private readonly client: SupabaseClient) {}

  /** `role: null` remove a chave em vez de sobrescrever `app_metadata` inteiro (merge do GoTrue). */
  async setRole(userId: string, role: WorkspaceRole | null): Promise<void> {
    const { error } = await this.client.auth.admin.updateUserById(userId, {
      app_metadata: { role },
    });
    if (error) {
      throw error;
    }
  }

  async getInviteByToken(token: string): Promise<{
    id: string;
    workspaceId: string;
    workspaceName: string;
    email: string;
    status: string;
    expiresAt: string;
  } | null> {
    const { data, error } = await this.client
      .from("workspace_invites")
      .select("id, workspace_id, email, status, expires_at, workspaces(name)")
      .eq("token", token)
      .maybeSingle();

    if (error || !data) {
      return null;
    }
    const row = data as unknown as {
      id: string;
      workspace_id: string;
      email: string;
      status: string;
      expires_at: string;
      workspaces: { name: string } | null;
    };
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      workspaceName: row.workspaces?.name ?? "",
      email: row.email,
      status: row.status,
      expiresAt: row.expires_at,
    };
  }

  /**
   * Verifica se o usuário já pertence a algum workspace (como owner ou member ativo) —
   * bypassa RLS deliberadamente porque, antes do aceite, o convidado não tem nenhuma relação
   * de posse que a RLS reconheça sobre workspaces de terceiros.
   */
  async userHasWorkspace(userId: string): Promise<boolean> {
    const [{ data: owned }, { data: membership }] = await Promise.all([
      this.client.from("workspaces").select("id").eq("owner_id", userId).maybeSingle(),
      this.client
        .from("workspace_members")
        .select("id")
        .eq("user_id", userId)
        .is("removed_at", null)
        .maybeSingle(),
    ]);
    return Boolean(owned) || Boolean(membership);
  }

  /**
   * Lista membros com nome (`profiles`) e e-mail (`workspace_invites`, capturado no convite) —
   * bypassa RLS porque o embed de `profiles`/`workspace_invites` respeitaria RLS de outra
   * pessoa se feito via client user-scoped, retornando `null` nesses campos. O chamador
   * (`WorkspacesService.listMembers`) já validou a posse do workspace via RLS antes de chegar
   * aqui.
   */
  async listMembersWithDetails(workspaceId: string): Promise<
    Array<{ id: string; userId: string; name: string | null; email: string | null; joinedAt: string }>
  > {
    const { data, error } = await this.client
      .from("workspace_members")
      .select("id, user_id, joined_at, profiles(name), workspace_invites(email)")
      .eq("workspace_id", workspaceId)
      .is("removed_at", null);
    if (error) {
      throw error;
    }
    return ((data ?? []) as unknown as Array<{
      id: string;
      user_id: string;
      joined_at: string;
      profiles: { name: string } | null;
      workspace_invites: { email: string } | null;
    }>).map((row) => ({
      id: row.id,
      userId: row.user_id,
      name: row.profiles?.name ?? null,
      email: row.workspace_invites?.email ?? null,
      joinedAt: row.joined_at,
    }));
  }

  /**
   * Fluxo de aceite de convite: cria a linha de membership, marca o convite como aceito e cria
   * o perfil de motorista vazio (workspace_member_profiles). Não-atômico (mesma limitação já
   * documentada em `VehicleGroupsService.setMembers` — o client Supabase JS não expõe
   * transação multi-statement) — falha parcial é possível mas de baixo impacto (linha órfã
   * detectável por auditoria, sem corrupção de dado de outro usuário).
   */
  async acceptInvite(
    inviteId: string,
    workspaceId: string,
    userId: string,
  ): Promise<{ memberId: string }> {
    const { data: member, error: memberError } = await this.client
      .from("workspace_members")
      .insert({ workspace_id: workspaceId, user_id: userId, invite_id: inviteId })
      .select("id")
      .single();
    if (memberError || !member) {
      throw memberError ?? new Error("Não foi possível criar o membro do workspace");
    }

    const memberId = (member as { id: string }).id;

    await this.client
      .from("workspace_invites")
      .update({ status: "accepted", accepted_at: new Date().toISOString(), accepted_by: userId })
      .eq("id", inviteId);

    await this.client.from("workspace_member_profiles").insert({ workspace_member_id: memberId });

    await this.setRole(userId, "workspace_member");

    return { memberId };
  }
}
