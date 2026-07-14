import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createUserScopedClient } from "../../shared/supabase/create-user-scoped-client";
import { AuditService } from "../../shared/audit/audit.service";
import { VehiclesService } from "../vehicles/vehicles.service";
import type { CreateOdometerCycleDto } from "./dto/create-odometer-cycle.dto";

export interface OdometerCycle {
  id: string;
  vehicle_id: string;
  cycle_number: number;
  started_at: string;
  starting_value: number;
  previous_cycle_max: number | null;
  reason: string;
  created_by: string;
  created_at: string;
}

const MIN_PAGE_SIZE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * @spec SPEC-20260711-001
 */
@Injectable()
export class OdometerCyclesService {
  constructor(
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly vehiclesService: VehiclesService,
  ) {}

  private clientForUser(accessToken: string): SupabaseClient {
    return createUserScopedClient(
      this.configService.getOrThrow<string>("SUPABASE_URL"),
      this.configService.getOrThrow<string>("SUPABASE_ANON_KEY"),
      accessToken,
    );
  }

  /**
   * @spec SPEC-20260711-001 RF-08, R-ODO-05
   * valida R-ODO-05
   */
  async create(
    accessToken: string,
    userId: string,
    vehicleId: string,
    dto: CreateOdometerCycleDto,
  ): Promise<OdometerCycle> {
    await this.vehiclesService.findOne(accessToken, userId, vehicleId);

    const client = this.clientForUser(accessToken);

    const { data: maxExpenseOdometer } = await client
      .from("expenses")
      .select("odometer_km")
      .eq("vehicle_id", vehicleId)
      .is("deleted_at", null)
      .not("odometer_km", "is", null)
      .order("odometer_km", { ascending: false })
      .limit(1)
      .maybeSingle();

    const previousCycleMax = (maxExpenseOdometer as { odometer_km: number } | null)?.odometer_km ?? null;

    const { data: lastCycle } = await client
      .from("vehicle_odometer_cycles")
      .select("cycle_number")
      .eq("vehicle_id", vehicleId)
      .order("cycle_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const cycleNumber = ((lastCycle as { cycle_number: number } | null)?.cycle_number ?? 1) + 1;

    const { data, error } = await client
      .from("vehicle_odometer_cycles")
      .insert({
        vehicle_id: vehicleId,
        cycle_number: cycleNumber,
        starting_value: dto.starting_value,
        previous_cycle_max: previousCycleMax,
        reason: dto.reason,
        created_by: userId,
      })
      .select("id, vehicle_id, cycle_number, started_at, starting_value, previous_cycle_max, reason, created_by, created_at")
      .single();

    if (error || !data) {
      throw new BadRequestException("Não foi possível criar o ciclo de odômetro");
    }

    void this.auditService.log({
      userId,
      action: "ODOMETER_CYCLE_CREATED",
      tableName: "vehicle_odometer_cycles",
      recordId: (data as OdometerCycle).id,
    });

    return data as OdometerCycle;
  }

  /**
   * @spec SPEC-20260711-001 RF-09, P1
   */
  async findAll(
    accessToken: string,
    userId: string,
    vehicleId: string,
    limit = DEFAULT_PAGE_SIZE,
    offset = 0,
  ): Promise<OdometerCycle[]> {
    await this.vehiclesService.findOne(accessToken, userId, vehicleId);

    const pageSize = Math.min(Math.max(limit, MIN_PAGE_SIZE), MAX_PAGE_SIZE);

    const { data, error } = await this.clientForUser(accessToken)
      .from("vehicle_odometer_cycles")
      .select("id, vehicle_id, cycle_number, started_at, starting_value, previous_cycle_max, reason, created_by, created_at")
      .eq("vehicle_id", vehicleId)
      .order("cycle_number", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new BadRequestException("Não foi possível listar os ciclos de odômetro");
    }
    return (data ?? []) as OdometerCycle[];
  }

  /**
   * @spec SPEC-20260711-001 RF-10, R-ODO-04
   * valida R-ODO-04
   */
  async getActiveCycleStart(
    accessToken: string,
    userId: string,
    vehicleId: string,
  ): Promise<string | null> {
    await this.vehiclesService.findOne(accessToken, userId, vehicleId);

    const { data, error } = await this.clientForUser(accessToken).rpc("get_active_cycle_start", {
      p_vehicle_id: vehicleId,
    });

    if (error) {
      return null;
    }
    return (data as string | null) ?? null;
  }
}
