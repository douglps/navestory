import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MAINTENANCE_STATUS_TRANSITIONS, type Maintenance, type MaintenanceStatus } from "@nave/validators";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AuditService } from "../../shared/audit/audit.service";
import { createUserScopedClient } from "../../shared/supabase/create-user-scoped-client";
import { SUPABASE_ADMIN_CLIENT } from "../../shared/supabase/supabase.constants";
import { FALLBACK_TIMEZONE, resolveDateTimeInput } from "../../shared/utils/date.utils";
import { ExpensesService } from "../expenses/expenses.service";
import { PreferencesService } from "../preferences/preferences.service";
import type { CreateMaintenanceDto } from "./dto/create-maintenance.dto";
import type { ListMaintenancesDto } from "./dto/list-maintenances.dto";
import type { UpdateMaintenanceDto } from "./dto/update-maintenance.dto";

/** @spec SPEC-20260715-002 R-TZ-04, RF-BK-10 — 24h de tolerância no futuro para completion_date */
const COMPLETION_DATE_FUTURE_TOLERANCE_MS = 24 * 60 * 60 * 1000;

const MAINTENANCE_COLUMNS = `id, user_id, vehicle_id, description, status, scheduled_date,
  completion_date, cost, odometer_km, metadata, created_at, updated_at`;

export type MaintenanceWithOdometerWarning = Maintenance & {
  odometer_warning?: true;
  odometer_previous_max_km?: number;
};

export interface PaginatedMaintenances {
  data: Maintenance[];
  meta: { total: number; page: number; limit: number; has_next: boolean };
}

/**
 * @spec SPEC-20260715-001
 * @spec SPEC-20260603-002
 */
@Injectable()
export class MaintenancesService {
  private readonly logger = new Logger(MaintenancesService.name);

  constructor(
    @Inject(SUPABASE_ADMIN_CLIENT) private readonly supabaseAdmin: SupabaseClient,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly expensesService: ExpensesService,
    private readonly preferencesService: PreferencesService,
  ) {}

  private clientForUser(accessToken: string): SupabaseClient {
    return createUserScopedClient(
      this.configService.getOrThrow<string>("SUPABASE_URL"),
      this.configService.getOrThrow<string>("SUPABASE_ANON_KEY"),
      accessToken,
    );
  }

  /** @spec SPEC-20260715-002 R-TZ-01, RF-BK-05 */
  private async resolveUserTimezone(accessToken: string, userId: string): Promise<string> {
    const preferences = await this.preferencesService.findOne(accessToken, userId);
    return preferences.timezone ?? FALLBACK_TIMEZONE;
  }

  private async assertVehicleOwnership(
    client: SupabaseClient,
    vehicleId: string,
    userId: string,
  ): Promise<void> {
    const { data, error } = await client
      .from("vehicles")
      .select("id")
      .eq("id", vehicleId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !data) {
      throw new NotFoundException("Veículo não encontrado");
    }
  }

  /**
   * @spec SPEC-20260715-001 RF-09
   */
  private async findMaxOdometerByVehicle(
    client: SupabaseClient,
    vehicleId: string,
    userId: string,
    excludeMaintenanceId?: string,
  ): Promise<number | null> {
    let builder = client
      .from("maintenances")
      .select("odometer_km")
      .eq("vehicle_id", vehicleId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .not("odometer_km", "is", null);

    if (excludeMaintenanceId) {
      builder = builder.neq("id", excludeMaintenanceId);
    }

    const { data, error } = await builder
      .order("odometer_km", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }
    return (data as { odometer_km: number }).odometer_km;
  }

  /**
   * @spec SPEC-20260715-001 RF-09
   */
  private async buildOdometerWarning(
    client: SupabaseClient,
    userId: string,
    vehicleId: string,
    odometerKm: number | null | undefined,
    excludeMaintenanceId?: string,
  ): Promise<Pick<MaintenanceWithOdometerWarning, "odometer_warning" | "odometer_previous_max_km">> {
    if (odometerKm == null) {
      return {};
    }

    try {
      const maxKm = await this.findMaxOdometerByVehicle(client, vehicleId, userId, excludeMaintenanceId);
      if (maxKm != null && odometerKm < maxKm) {
        return { odometer_warning: true, odometer_previous_max_km: maxKm };
      }
    } catch (err) {
      this.logger.error("Falha ao verificar sequência de odômetro", err as Error);
    }
    return {};
  }

  /**
   * @spec SPEC-20260715-001 RF-01, RF-02, RF-03, RF-09, RF-13
   */
  async create(
    accessToken: string,
    userId: string,
    dto: CreateMaintenanceDto,
  ): Promise<MaintenanceWithOdometerWarning> {
    const client = this.clientForUser(accessToken);
    await this.assertVehicleOwnership(client, dto.vehicle_id, userId);

    const tz = await this.resolveUserTimezone(accessToken, userId);

    // `status` nunca faz parte de createMaintenanceInputSchema, mas é removido explicitamente
    // aqui (defesa em profundidade) para o caso de o service ser chamado fora do pipeline de
    // validação Zod do controller (RF-03) — toda criação nasce com o default `scheduled` do banco.
    const insertPayload: Record<string, unknown> = {
      ...dto,
      user_id: userId,
      scheduled_date: resolveDateTimeInput(dto.scheduled_date, tz),
      completion_date: dto.completion_date != null ? resolveDateTimeInput(dto.completion_date, tz) : null,
    };
    delete insertPayload.status;

    const { data, error } = await client
      .from("maintenances")
      .insert(insertPayload)
      .select(MAINTENANCE_COLUMNS)
      .single();

    if (error || !data) {
      throw new NotFoundException("Não foi possível criar a manutenção");
    }

    void this.auditService.log({
      userId,
      action: "MAINTENANCE_CREATED",
      tableName: "maintenances",
      recordId: (data as Maintenance).id,
    });

    const maintenance = data as Maintenance;
    const warning = await this.buildOdometerWarning(
      client,
      userId,
      maintenance.vehicle_id,
      maintenance.odometer_km,
      maintenance.id,
    );

    return { ...maintenance, ...warning };
  }

  /**
   * @spec SPEC-20260715-001 RF-04
   */
  async findAll(
    accessToken: string,
    userId: string,
    query: ListMaintenancesDto,
  ): Promise<PaginatedMaintenances> {
    const client = this.clientForUser(accessToken);
    const { page, limit, vehicle_id, status } = query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let builder = client
      .from("maintenances")
      .select(MAINTENANCE_COLUMNS, { count: "exact" })
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (vehicle_id) {
      builder = builder.eq("vehicle_id", vehicle_id);
    }
    if (status) {
      builder = builder.eq("status", status);
    }

    const { data, error, count } = await builder
      .order("scheduled_date", { ascending: true })
      .range(from, to);

    if (error) {
      throw new NotFoundException("Não foi possível listar as manutenções");
    }

    const total = count ?? 0;
    return {
      data: (data ?? []) as Maintenance[],
      meta: { total, page, limit, has_next: from + (data?.length ?? 0) < total },
    };
  }

  /**
   * @spec SPEC-20260715-001 RF-05
   */
  async findOne(accessToken: string, userId: string, maintenanceId: string): Promise<Maintenance> {
    const { data, error } = await this.clientForUser(accessToken)
      .from("maintenances")
      .select(MAINTENANCE_COLUMNS)
      .eq("id", maintenanceId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !data) {
      throw new NotFoundException("Manutenção não encontrada");
    }
    return data as Maintenance;
  }

  /**
   * @spec SPEC-20260715-001 RF-06, RF-07, RF-08, RF-09, RF-10, RF-11, RF-14
   * @spec SPEC-20260603-002 RF-01 a RF-10
   */
  async update(
    accessToken: string,
    userId: string,
    maintenanceId: string,
    dto: UpdateMaintenanceDto,
  ): Promise<MaintenanceWithOdometerWarning> {
    const existing = await this.findOne(accessToken, userId, maintenanceId);
    const client = this.clientForUser(accessToken);
    const tz = await this.resolveUserTimezone(accessToken, userId);

    if (dto.status) {
      const allowed: MaintenanceStatus[] = MAINTENANCE_STATUS_TRANSITIONS[existing.status];
      if (!allowed.includes(dto.status)) {
        throw new ConflictException(`Transição inválida: ${existing.status} → ${dto.status}`);
      }

      if (dto.status === "completed" && (dto.odometer_km ?? existing.odometer_km) == null) {
        throw new UnprocessableEntityException(
          "odometer_km é obrigatório para concluir uma manutenção",
        );
      }
    }

    const changes: Record<string, unknown> = { ...dto };

    if (dto.scheduled_date != null) {
      changes.scheduled_date = resolveDateTimeInput(dto.scheduled_date, tz);
    }

    if (dto.completion_date !== undefined) {
      const resolvedCompletionDate =
        dto.completion_date != null ? resolveDateTimeInput(dto.completion_date, tz) : null;

      // @spec SPEC-20260715-002 RF-BK-10, R-TZ-04 — completion_date não pode exceder "agora" em
      // mais de 24h (dia/hora calendário do usuário); diferente de RF-BK-09 (despesa futura), aqui
      // a operação é bloqueada, não apenas sinalizada.
      if (
        resolvedCompletionDate != null &&
        new Date(resolvedCompletionDate).getTime() - Date.now() > COMPLETION_DATE_FUTURE_TOLERANCE_MS
      ) {
        throw new UnprocessableEntityException(
          "completion_date não pode exceder a data/hora atual em mais de 24 horas",
        );
      }

      changes.completion_date = resolvedCompletionDate;
    }

    const { data, error } = await client
      .from("maintenances")
      .update(changes)
      .eq("id", maintenanceId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .select(MAINTENANCE_COLUMNS)
      .maybeSingle();

    if (error || !data) {
      throw new NotFoundException("Manutenção não encontrada");
    }

    void this.auditService.log({
      userId,
      action: "MAINTENANCE_UPDATED",
      tableName: "maintenances",
      recordId: maintenanceId,
      changes,
    });

    const updated = data as Maintenance;

    if (dto.status && dto.status !== existing.status) {
      if (updated.status === "completed" && updated.cost != null) {
        await this.expensesService.createFromSource(accessToken, userId, {
          source_type: "maintenance",
          source_id: updated.id,
          vehicle_id: updated.vehicle_id,
          category: "maintenance",
          amount: updated.cost,
          date: updated.completion_date ?? updated.scheduled_date,
          description: updated.description,
        });
      } else if (updated.status === "cancelled") {
        await this.expensesService.softDeleteBySource(accessToken, userId, "maintenance", updated.id);
      }
    }

    const warning = await this.buildOdometerWarning(
      client,
      userId,
      updated.vehicle_id,
      updated.odometer_km,
      updated.id,
    );

    return { ...updated, ...warning };
  }

  /**
   * @spec SPEC-20260715-001 RF-12, R5, R-HUB-01
   */
  async remove(accessToken: string, userId: string, maintenanceId: string): Promise<void> {
    await this.findOne(accessToken, userId, maintenanceId);

    const { error } = await this.clientForUser(accessToken)
      .from("maintenances")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", maintenanceId)
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (error) {
      throw new NotFoundException("Não foi possível remover a manutenção");
    }

    void this.auditService.log({
      userId,
      action: "MAINTENANCE_DELETED",
      tableName: "maintenances",
      recordId: maintenanceId,
    });

    await this.expensesService.softDeleteBySource(accessToken, userId, "maintenance", maintenanceId);
  }
}
