import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AuditService } from "../../shared/audit/audit.service";
import { createUserScopedClient } from "../../shared/supabase/create-user-scoped-client";
import { SUPABASE_ADMIN_CLIENT } from "../../shared/supabase/supabase.constants";
import type { CreateVehicleDto } from "./dto/create-vehicle.dto";
import type { UpdateVehicleDto } from "./dto/update-vehicle.dto";
import { LicensePlate } from "./value-objects/license-plate.vo";

export interface Vehicle {
  id: string;
  user_id: string;
  plate: string;
  make: string | null;
  model: string | null;
  year: number | null;
  vehicle_type: string;
  [key: string]: unknown;
}

const VEHICLE_COLUMNS = `id, user_id, plate, make, model, year, model_year, nickname, color,
  photo_url, photo_thumbnail_url, photo_object_position, photo_zoom, odometer, fuel_type,
  fuel_efficiency, fuel_liters_capacity, vehicle_type, status, renavam, chassi, fipe_code,
  fipe_updated_at, ipva_due_date, engine_displacement_cc, engine_power_cv, engine_torque_kgm,
  engine_config, is_turbo, created_at, updated_at`;

/**
 * @spec SPEC-20260602-002
 */
@Injectable()
export class VehiclesService {
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

  /**
   * @spec SPEC-20260602-002 RF-01, RF-02
   */
  async create(accessToken: string, userId: string, dto: CreateVehicleDto): Promise<Vehicle> {
    const plate = LicensePlate.create(dto.plate);

    const { data, error } = await this.clientForUser(accessToken)
      .from("vehicles")
      .insert({ ...dto, plate: plate.toString(), user_id: userId })
      .select(VEHICLE_COLUMNS)
      .single();

    if (error || !data) {
      throw new NotFoundException("Não foi possível criar o veículo");
    }

    void this.auditService.log({
      userId,
      action: "VEHICLE_CREATED",
      tableName: "vehicles",
      recordId: (data as Vehicle).id,
    });

    return data as Vehicle;
  }

  /**
   * @spec SPEC-20260602-002 RF-03, RF-16
   */
  async findAll(accessToken: string, userId: string): Promise<Vehicle[]> {
    const { data, error } = await this.clientForUser(accessToken)
      .from("vehicles")
      .select(VEHICLE_COLUMNS)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      throw new NotFoundException("Não foi possível listar os veículos");
    }
    return (data ?? []) as Vehicle[];
  }

  /**
   * @spec SPEC-20260602-002 RF-04, RF-15, RF-16
   */
  async findOne(accessToken: string, userId: string, vehicleId: string): Promise<Vehicle> {
    const { data, error } = await this.clientForUser(accessToken)
      .from("vehicles")
      .select(VEHICLE_COLUMNS)
      .eq("id", vehicleId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !data) {
      throw new NotFoundException("Veículo não encontrado");
    }
    return data as Vehicle;
  }

  /**
   * @spec SPEC-20260602-002 RF-05
   */
  async update(
    accessToken: string,
    userId: string,
    vehicleId: string,
    dto: UpdateVehicleDto,
  ): Promise<Vehicle> {
    const patch: Record<string, unknown> = { ...dto };
    if (dto.plate) {
      patch.plate = LicensePlate.create(dto.plate).toString();
    }

    const { data, error } = await this.clientForUser(accessToken)
      .from("vehicles")
      .update(patch)
      .eq("id", vehicleId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .select(VEHICLE_COLUMNS)
      .maybeSingle();

    if (error || !data) {
      throw new NotFoundException("Veículo não encontrado");
    }

    void this.auditService.log({
      userId,
      action: "VEHICLE_UPDATED",
      tableName: "vehicles",
      recordId: vehicleId,
      changes: patch,
    });

    return data as Vehicle;
  }

  /**
   * @spec SPEC-20260602-002 RF-06, RF-15, R-VEH-01
   * Soft-delete em cascata: veículo, despesas e manutenções recebem o mesmo `deleted_at`.
   */
  async remove(accessToken: string, userId: string, vehicleId: string): Promise<void> {
    const client = this.clientForUser(accessToken);
    const deletedAt = new Date().toISOString();

    const { data: existing, error: findError } = await client
      .from("vehicles")
      .select("id")
      .eq("id", vehicleId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (findError || !existing) {
      throw new NotFoundException("Veículo não encontrado");
    }

    const [vehicleResult, expensesResult, maintenancesResult] = await Promise.all([
      client
        .from("vehicles")
        .update({ deleted_at: deletedAt })
        .eq("id", vehicleId)
        .eq("user_id", userId),
      client
        .from("expenses")
        .update({ deleted_at: deletedAt })
        .eq("vehicle_id", vehicleId)
        .is("deleted_at", null),
      client
        .from("maintenances")
        .update({ deleted_at: deletedAt })
        .eq("vehicle_id", vehicleId)
        .is("deleted_at", null),
    ]);

    if (vehicleResult.error || expensesResult.error || maintenancesResult.error) {
      throw new NotFoundException("Não foi possível remover o veículo");
    }

    void this.auditService.log({
      userId,
      action: "VEHICLE_DELETED",
      tableName: "vehicles",
      recordId: vehicleId,
    });
  }
}
