import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ComplianceEntry, ComplianceQuery, CnhStatus } from "@navestory/validators";
import { createUserScopedClient } from "../../shared/supabase/create-user-scoped-client";
import { FALLBACK_TIMEZONE, toCalendarDay } from "../../shared/utils/date.utils";
import { AuditService } from "../../shared/audit/audit.service";
import { WorkspaceAdminSupabaseService } from "../workspaces/services/workspace-admin-supabase.service";
import type { UpdateDriverSettingsDto } from "./dto/update-driver-settings.dto";
import type { UpdateMemberProfileDto } from "./dto/update-member-profile.dto";

interface DriverSettingsRow {
  workspace_id: string;
  require_cnh_number: boolean;
  require_cnh_expiry: boolean;
  require_cnh_category: boolean;
  require_phone: boolean;
  updated_at: string;
}

interface MemberProfileRow {
  workspace_member_id: string;
  cnh_number: string | null;
  cnh_category: string | null;
  cnh_expires_at: string | null;
  phone: string | null;
  updated_at: string;
}

const DEFAULT_SETTINGS = {
  require_cnh_number: true,
  require_cnh_expiry: true,
  require_cnh_category: true,
  require_phone: true,
};

/**
 * @spec specs/fleet-admin/SPEC-20260804-003-fleet-settings.md
 */
@Injectable()
export class FleetSettingsService {
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

  /** @spec RF-01, RF-02, R-FLEET-01 — defaults do sistema quando nenhuma linha existe ainda */
  async getDriverSettings(accessToken: string, workspaceId: string) {
    const { data } = await this.clientForUser(accessToken)
      .from("workspace_driver_settings")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    const row = data as DriverSettingsRow | null;
    return {
      workspaceId,
      requireCnhNumber: row?.require_cnh_number ?? DEFAULT_SETTINGS.require_cnh_number,
      requireCnhExpiry: row?.require_cnh_expiry ?? DEFAULT_SETTINGS.require_cnh_expiry,
      requireCnhCategory: row?.require_cnh_category ?? DEFAULT_SETTINGS.require_cnh_category,
      requirePhone: row?.require_phone ?? DEFAULT_SETTINGS.require_phone,
    };
  }

  /** @spec RF-02, RF-14, C2, R-FLEET-02 — upsert; não retroage sobre registros já preenchidos */
  async updateDriverSettings(accessToken: string, userId: string, workspaceId: string, dto: UpdateDriverSettingsDto) {
    const client = this.clientForUser(accessToken);
    const current = await this.getDriverSettings(accessToken, workspaceId);

    const next = {
      workspace_id: workspaceId,
      require_cnh_number: dto.requireCnhNumber ?? current.requireCnhNumber,
      require_cnh_expiry: dto.requireCnhExpiry ?? current.requireCnhExpiry,
      require_cnh_category: dto.requireCnhCategory ?? current.requireCnhCategory,
      require_phone: dto.requirePhone ?? current.requirePhone,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    };

    const { error } = await client.from("workspace_driver_settings").upsert(next);
    if (error) {
      throw new NotFoundException("Workspace não encontrado ou você não é o owner");
    }

    void this.auditService.log({
      userId,
      action: "fleet_settings_updated",
      tableName: "workspace_driver_settings",
      recordId: workspaceId,
      changes: { before: current, after: next },
    });

    return this.getDriverSettings(accessToken, workspaceId);
  }

  /** @spec RF-04 — perfil do próprio member autenticado, RLS auto-escopa à única linha visível */
  async getMyProfile(accessToken: string) {
    const { data } = await this.clientForUser(accessToken)
      .from("workspace_member_profiles")
      .select("*")
      .maybeSingle();
    return this.toProfileResponse(data as MemberProfileRow | null);
  }

  async updateMyProfile(accessToken: string, dto: UpdateMemberProfileDto) {
    const client = this.clientForUser(accessToken);
    const { data: existing } = await client.from("workspace_member_profiles").select("workspace_member_id").maybeSingle();
    if (!existing) {
      throw new NotFoundException("Perfil de motorista não encontrado");
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (dto.cnhNumber !== undefined) patch.cnh_number = dto.cnhNumber;
    if (dto.cnhCategory !== undefined) patch.cnh_category = dto.cnhCategory;
    if (dto.cnhExpiresAt !== undefined) patch.cnh_expires_at = dto.cnhExpiresAt;
    if (dto.phone !== undefined) patch.phone = dto.phone;

    const { data, error } = await client
      .from("workspace_member_profiles")
      .update(patch)
      .eq("workspace_member_id", (existing as { workspace_member_id: string }).workspace_member_id)
      .select("*")
      .single();
    if (error || !data) {
      throw new NotFoundException("Não foi possível atualizar o perfil");
    }
    return this.toProfileResponse(data as MemberProfileRow);
  }

  /** @spec RF-13 — detalhe de um membro específico, visão do owner */
  async getMemberProfile(accessToken: string, memberId: string) {
    const { data } = await this.clientForUser(accessToken)
      .from("workspace_member_profiles")
      .select("*")
      .eq("workspace_member_id", memberId)
      .maybeSingle();
    if (!data) {
      throw new NotFoundException("Perfil de motorista não encontrado");
    }
    return this.toProfileResponse(data as MemberProfileRow);
  }

  /** @spec RF-07, RF-08, RF-09, RF-10, RF-11, RF-12, R-TZ-01 */
  async getCompliance(accessToken: string, userId: string, workspaceId: string, query: ComplianceQuery): Promise<ComplianceEntry[]> {
    const client = this.clientForUser(accessToken);

    const [{ data: settingsRow }, { data: profileRows }, { data: prefsRow }] = await Promise.all([
      client.from("workspace_driver_settings").select("*").eq("workspace_id", workspaceId).maybeSingle(),
      client.from("workspace_member_profiles").select("*"),
      client.from("user_preferences").select("timezone").eq("user_id", userId).maybeSingle(),
    ]);

    const settings = {
      require_cnh_number: (settingsRow as DriverSettingsRow | null)?.require_cnh_number ?? DEFAULT_SETTINGS.require_cnh_number,
      require_cnh_expiry: (settingsRow as DriverSettingsRow | null)?.require_cnh_expiry ?? DEFAULT_SETTINGS.require_cnh_expiry,
      require_cnh_category: (settingsRow as DriverSettingsRow | null)?.require_cnh_category ?? DEFAULT_SETTINGS.require_cnh_category,
      require_phone: (settingsRow as DriverSettingsRow | null)?.require_phone ?? DEFAULT_SETTINGS.require_phone,
    };

    const profileByMemberId = new Map(
      ((profileRows ?? []) as MemberProfileRow[]).map((row) => [row.workspace_member_id, row]),
    );

    const members = await this.workspaceAdmin.listMembersWithDetails(workspaceId);
    const timezone = (prefsRow as { timezone: string | null } | null)?.timezone ?? FALLBACK_TIMEZONE;
    const today = toCalendarDay(new Date(), timezone);

    const entries: ComplianceEntry[] = members.map((member) => {
      const profile = profileByMemberId.get(member.id) ?? null;
      const { status: registrationStatus, missingFields } = computeRegistrationStatus(settings, profile);
      const { status: cnhStatus, daysRemaining } = computeCnhStatus(profile?.cnh_expires_at ?? null, today);

      return {
        memberId: member.id,
        name: member.name,
        email: member.email,
        registrationStatus,
        missingFields,
        cnhStatus,
        cnhExpiresAt: profile?.cnh_expires_at ?? null,
        cnhDaysRemaining: daysRemaining,
      };
    });

    return entries.filter((entry) => {
      if (query.registrationStatus && entry.registrationStatus !== query.registrationStatus) {
        return false;
      }
      if (query.cnhStatus && entry.cnhStatus !== query.cnhStatus) {
        return false;
      }
      return true;
    });
  }

  private toProfileResponse(row: MemberProfileRow | null) {
    if (!row) {
      return null;
    }
    return {
      workspaceMemberId: row.workspace_member_id,
      cnhNumber: row.cnh_number,
      cnhCategory: row.cnh_category,
      cnhExpiresAt: row.cnh_expires_at,
      phone: row.phone,
      updatedAt: row.updated_at,
    };
  }
}

function computeRegistrationStatus(
  settings: { require_cnh_number: boolean; require_cnh_expiry: boolean; require_cnh_category: boolean; require_phone: boolean },
  profile: MemberProfileRow | null,
): { status: "complete" | "incomplete"; missingFields: string[] } {
  const missing: string[] = [];
  if (settings.require_cnh_number && !profile?.cnh_number) missing.push("cnhNumber");
  if (settings.require_cnh_expiry && !profile?.cnh_expires_at) missing.push("cnhExpiresAt");
  if (settings.require_cnh_category && !profile?.cnh_category) missing.push("cnhCategory");
  if (settings.require_phone && !profile?.phone) missing.push("phone");
  return { status: missing.length === 0 ? "complete" : "incomplete", missingFields: missing };
}

/** @spec R-DS-08 — mesma escala de urgência de `urgencyBadge`: danger/urgency-hot/warning/ok */
function computeCnhStatus(cnhExpiresAt: string | null, today: string): { status: CnhStatus; daysRemaining: number | null } {
  if (!cnhExpiresAt) {
    return { status: "not_set", daysRemaining: null };
  }
  const daysRemaining = daysBetween(today, cnhExpiresAt);
  if (daysRemaining < 0) return { status: "expired", daysRemaining };
  if (daysRemaining <= 7) return { status: "urgency_hot", daysRemaining };
  if (daysRemaining <= 30) return { status: "warning", daysRemaining };
  return { status: "ok", daysRemaining };
}

function daysBetween(today: string, target: string): number {
  const todayUtc = calendarDayToUtc(today);
  const targetUtc = calendarDayToUtc(target);
  return Math.round((targetUtc - todayUtc) / 86_400_000);
}

function calendarDayToUtc(dateOnly: string): number {
  const parts = dateOnly.split("-").map(Number);
  const year = parts[0] ?? 0;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  return Date.UTC(year, month - 1, day);
}
