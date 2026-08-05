import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { createUserScopedClient } from "../../shared/supabase/create-user-scoped-client";
import { AuditService } from "../../shared/audit/audit.service";
import type { AssignVehicleDto } from "./dto/assign-vehicle.dto";
import type { CreateInviteDto } from "./dto/create-invite.dto";
import type { CreateWorkspaceDto } from "./dto/create-workspace.dto";
import { WorkspaceAdminSupabaseService } from "./services/workspace-admin-supabase.service";

const WORKSPACE_COLUMNS = "id, owner_id, name, created_at, updated_at";

/**
 * @spec specs/workspace/SPEC-20260804-004-workspace-foundation.md
 * Operações de owner usam client user-scoped (RLS é a barreira real, mesmo padrão de
 * `VehicleGroupsService`); escrita de `app_metadata.role` e o fluxo de aceite de convite
 * (cross-user) delegam ao `WorkspaceAdminSupabaseService` dedicado.
 */
@Injectable()
export class WorkspacesService {
  constructor(
    private readonly configService: ConfigService,
    private readonly workspaceAdmin: WorkspaceAdminSupabaseService,
    private readonly auditService: AuditService,
  ) {}

  private clientForUser(accessToken: string): SupabaseClient {
    return createUserScopedClient(
      this.configService.getOrThrow<string>("SUPABASE_URL"),
      this.configService.getOrThrow<string>("SUPABASE_ANON_KEY"),
      accessToken,
    );
  }

  /** @spec RF-01, R-WS-01 */
  async createWorkspace(accessToken: string, userId: string, dto: CreateWorkspaceDto) {
    const client = this.clientForUser(accessToken);

    const { data: existing } = await client
      .from("workspaces")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    if (existing) {
      throw new ConflictException("Você já é dono de um workspace");
    }

    const { data, error } = await client
      .from("workspaces")
      .insert({ owner_id: userId, name: dto.name })
      .select(WORKSPACE_COLUMNS)
      .single();
    if (error || !data) {
      throw new ConflictException("Não foi possível criar o workspace");
    }

    await this.workspaceAdmin.setRole(userId, "workspace_owner");

    void this.auditService.log({
      userId,
      action: "WORKSPACE_CREATED",
      tableName: "workspaces",
      recordId: (data as { id: string }).id,
      changes: { name: dto.name },
    });

    return { ...data, role: "workspace_owner" as const };
  }

  /** @spec RF-02 */
  async getMyWorkspace(accessToken: string, userId: string) {
    const client = this.clientForUser(accessToken);

    const { data: owned } = await client
      .from("workspaces")
      .select(WORKSPACE_COLUMNS)
      .eq("owner_id", userId)
      .maybeSingle();
    if (owned) {
      return { ...owned, role: "workspace_owner" as const };
    }

    const { data: membership } = await client
      .from("workspace_members")
      .select(`workspace_id, workspaces (${WORKSPACE_COLUMNS})`)
      .eq("user_id", userId)
      .is("removed_at", null)
      .maybeSingle();

    const workspace = (membership as { workspaces: Record<string, unknown> } | null)?.workspaces;
    if (workspace) {
      return { ...workspace, role: "workspace_member" as const };
    }

    throw new NotFoundException("Usuário não pertence a nenhum workspace");
  }

  /** @spec RF-03, R-WS-02 */
  async createInvite(accessToken: string, userId: string, workspaceId: string, dto: CreateInviteDto) {
    const client = this.clientForUser(accessToken);
    const token = randomBytes(32).toString("hex");

    const { data, error } = await client
      .from("workspace_invites")
      .insert({ workspace_id: workspaceId, email: dto.email, token, invited_by: userId })
      .select("id, email, status, expires_at")
      .single();
    if (error || !data) {
      throw new NotFoundException("Workspace não encontrado ou você não é o owner");
    }

    void this.auditService.log({
      userId,
      action: "WORKSPACE_MEMBER_INVITED",
      tableName: "workspace_invites",
      recordId: (data as { id: string }).id,
      changes: { email: dto.email },
    });

    const inviteUrl = `${this.configService.getOrThrow<string>("WEB_APP_URL")}/workspace/invite/${token}`;
    return { ...data, inviteUrl };
  }

  /** @spec RF-04, RNF-03 — mensagem genérica, sem distinguir "não existe" de "expirado/usado" */
  async getInviteByToken(token: string) {
    const invite = await this.workspaceAdmin.getInviteByToken(token);
    if (!invite || invite.status !== "pending" || new Date(invite.expiresAt) < new Date()) {
      throw new NotFoundException("Convite inválido ou expirado");
    }
    return { workspaceName: invite.workspaceName, email: invite.email };
  }

  /** @spec RF-05, R-WS-03 */
  async acceptInvite(userId: string, token: string) {
    const invite = await this.workspaceAdmin.getInviteByToken(token);
    if (!invite || invite.status !== "pending" || new Date(invite.expiresAt) < new Date()) {
      throw new NotFoundException("Convite inválido ou expirado");
    }

    const alreadyHasWorkspace = await this.workspaceAdmin.userHasWorkspace(userId);
    if (alreadyHasWorkspace) {
      throw new ConflictException("Você já pertence a um workspace");
    }

    const { memberId } = await this.workspaceAdmin.acceptInvite(invite.id, invite.workspaceId, userId);

    void this.auditService.log({
      userId,
      action: "WORKSPACE_MEMBER_JOINED",
      tableName: "workspace_members",
      recordId: memberId,
      changes: { workspaceId: invite.workspaceId },
    });

    return { workspaceId: invite.workspaceId, memberId };
  }

  /** @spec RF-06 */
  async listMembers(accessToken: string, userId: string, workspaceId: string) {
    await this.assertOwnsWorkspace(accessToken, userId, workspaceId);
    return this.workspaceAdmin.listMembersWithDetails(workspaceId);
  }

  /** @spec RF-07, R-WS-05 */
  async removeMember(accessToken: string, userId: string, workspaceId: string, memberId: string) {
    const client = this.clientForUser(accessToken);

    const { data: member, error } = await client
      .from("workspace_members")
      .update({ removed_at: new Date().toISOString() })
      .eq("id", memberId)
      .eq("workspace_id", workspaceId)
      .is("removed_at", null)
      .select("user_id")
      .single();
    if (error || !member) {
      throw new NotFoundException("Membro não encontrado");
    }

    const removedUserId = (member as { user_id: string }).user_id;
    await this.workspaceAdmin.setRole(removedUserId, null);

    void this.auditService.log({
      userId,
      action: "WORKSPACE_MEMBER_REMOVED",
      tableName: "workspace_members",
      recordId: memberId,
      changes: { removedUserId },
    });
  }

  /** @spec RF-08, R-WS-04 */
  async assignVehicle(accessToken: string, userId: string, workspaceId: string, vehicleId: string, dto: AssignVehicleDto) {
    const client = this.clientForUser(accessToken);

    const { data: vehicle } = await client
      .from("vehicles")
      .select("id")
      .eq("id", vehicleId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!vehicle) {
      throw new ForbiddenException("Veículo não pertence a você");
    }

    const { data: member } = await client
      .from("workspace_members")
      .select("id")
      .eq("id", dto.memberId)
      .eq("workspace_id", workspaceId)
      .is("removed_at", null)
      .maybeSingle();
    if (!member) {
      throw new NotFoundException("Membro não encontrado no workspace");
    }

    const { error } = await client
      .from("workspace_vehicle_assignments")
      .upsert({ vehicle_id: vehicleId, workspace_id: workspaceId, member_id: dto.memberId, assigned_by: userId });
    if (error) {
      throw new ConflictException("Não foi possível atribuir o veículo");
    }

    void this.auditService.log({
      userId,
      action: "WORKSPACE_VEHICLE_ASSIGNED",
      tableName: "workspace_vehicle_assignments",
      recordId: vehicleId,
      changes: { memberId: dto.memberId },
    });
  }

  /** @spec RF-08, RF-09 — usado pelo frontend para pré-selecionar o combobox de atribuição */
  async listVehicleAssignments(accessToken: string, workspaceId: string) {
    const client = this.clientForUser(accessToken);
    const { data, error } = await client
      .from("workspace_vehicle_assignments")
      .select("vehicle_id, member_id")
      .eq("workspace_id", workspaceId);
    if (error) {
      throw new NotFoundException("Workspace não encontrado");
    }
    return ((data ?? []) as Array<{ vehicle_id: string; member_id: string }>).map((row) => ({
      vehicleId: row.vehicle_id,
      memberId: row.member_id,
    }));
  }

  /** @spec RF-09 */
  async unassignVehicle(accessToken: string, userId: string, workspaceId: string, vehicleId: string) {
    const client = this.clientForUser(accessToken);
    const { error } = await client
      .from("workspace_vehicle_assignments")
      .delete()
      .eq("vehicle_id", vehicleId)
      .eq("workspace_id", workspaceId);
    if (error) {
      throw new NotFoundException("Atribuição não encontrada");
    }

    void this.auditService.log({
      userId,
      action: "WORKSPACE_VEHICLE_UNASSIGNED",
      tableName: "workspace_vehicle_assignments",
      recordId: vehicleId,
      changes: {},
    });
  }

  private async assertOwnsWorkspace(accessToken: string, userId: string, workspaceId: string): Promise<void> {
    const client = this.clientForUser(accessToken);
    const { data } = await client
      .from("workspaces")
      .select("id")
      .eq("id", workspaceId)
      .eq("owner_id", userId)
      .maybeSingle();
    if (!data) {
      throw new NotFoundException("Workspace não encontrado");
    }
  }
}
