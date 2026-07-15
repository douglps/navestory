import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FINE_STATUS_TRANSITIONS, type Fine, type FineStatus } from "@nave/validators";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AuditService } from "../../shared/audit/audit.service";
import { createUserScopedClient } from "../../shared/supabase/create-user-scoped-client";
import { SUPABASE_ADMIN_CLIENT } from "../../shared/supabase/supabase.constants";
import { ExpensesService } from "../expenses/expenses.service";
import type { CreateFineDto } from "./dto/create-fine.dto";
import type { UpdateFineDto } from "./dto/update-fine.dto";

const FINE_COLUMNS = `id, user_id, vehicle_id, description, amount, occurred_at, auto_number,
  infraction_code, amount_with_discount, due_date, paid_at, appeal_deadline, location, odometer_km,
  driver_name, status, notes, created_at, updated_at`;

/**
 * @spec SPEC-20260607-001
 */
@Injectable()
export class FinesService {
  constructor(
    @Inject(SUPABASE_ADMIN_CLIENT) private readonly supabaseAdmin: SupabaseClient,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly expensesService: ExpensesService,
  ) {}

  private clientForUser(accessToken: string): SupabaseClient {
    return createUserScopedClient(
      this.configService.getOrThrow<string>("SUPABASE_URL"),
      this.configService.getOrThrow<string>("SUPABASE_ANON_KEY"),
      accessToken,
    );
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
   * @spec SPEC-20260607-001 RF-01
   * @spec EPIC-FIN-001 R-LED-02
   */
  async create(accessToken: string, userId: string, dto: CreateFineDto): Promise<Fine> {
    const client = this.clientForUser(accessToken);
    await this.assertVehicleOwnership(client, dto.vehicle_id, userId);

    if (dto.amount_with_discount != null && dto.amount_with_discount > dto.amount) {
      throw new ConflictException("Valor com desconto não pode ser maior que o valor original");
    }

    const { data, error } = await client
      .from("fines")
      .insert({ ...dto, user_id: userId })
      .select(FINE_COLUMNS)
      .single();

    if (error || !data) {
      throw new NotFoundException("Não foi possível criar a multa");
    }

    void this.auditService.log({
      userId,
      action: "FINE_CREATED",
      tableName: "fines",
      recordId: (data as Fine).id,
    });

    const fine = data as Fine;
    await this.expensesService.createFromSource(accessToken, userId, {
      source_type: "fine",
      source_id: fine.id,
      vehicle_id: fine.vehicle_id,
      category: "fine",
      amount: fine.amount_with_discount ?? fine.amount,
      date: fine.occurred_at,
      description: fine.description,
    });

    return fine;
  }

  /**
   * @spec SPEC-20260607-001 RF-02
   */
  async findAll(accessToken: string, userId: string, status?: FineStatus): Promise<Fine[]> {
    let builder = this.clientForUser(accessToken)
      .from("fines")
      .select(FINE_COLUMNS)
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (status) {
      builder = builder.eq("status", status);
    }

    const { data, error } = await builder.order("occurred_at", { ascending: false });

    if (error) {
      throw new NotFoundException("Não foi possível listar as multas");
    }
    return (data ?? []) as Fine[];
  }

  /**
   * @spec SPEC-20260607-001 RF-02
   */
  async findByVehicle(accessToken: string, userId: string, vehicleId: string): Promise<Fine[]> {
    const client = this.clientForUser(accessToken);
    await this.assertVehicleOwnership(client, vehicleId, userId);

    const { data, error } = await client
      .from("fines")
      .select(FINE_COLUMNS)
      .eq("user_id", userId)
      .eq("vehicle_id", vehicleId)
      .is("deleted_at", null)
      .order("occurred_at", { ascending: false });

    if (error) {
      throw new NotFoundException("Não foi possível listar as multas do veículo");
    }
    return (data ?? []) as Fine[];
  }

  /**
   * @spec SPEC-20260607-001 RF-03
   */
  async findOne(accessToken: string, userId: string, fineId: string): Promise<Fine> {
    const { data, error } = await this.clientForUser(accessToken)
      .from("fines")
      .select(FINE_COLUMNS)
      .eq("id", fineId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !data) {
      throw new NotFoundException("Multa não encontrada");
    }
    return data as Fine;
  }

  /**
   * @spec SPEC-20260607-001 RF-04, RF-05
   */
  async update(
    accessToken: string,
    userId: string,
    fineId: string,
    dto: UpdateFineDto,
  ): Promise<Fine> {
    const existing = await this.findOne(accessToken, userId, fineId);

    if (dto.status && dto.status !== existing.status) {
      const allowed = FINE_STATUS_TRANSITIONS[existing.status];
      if (!allowed.includes(dto.status)) {
        throw new ConflictException(
          `Transição de status inválida: ${existing.status} → ${dto.status}`,
        );
      }
    }

    const amountWithDiscount = dto.amount_with_discount ?? existing.amount_with_discount;
    const amount = dto.amount ?? existing.amount;
    if (amountWithDiscount != null && amountWithDiscount > amount) {
      throw new ConflictException("Valor com desconto não pode ser maior que o valor original");
    }

    const changes: Record<string, unknown> = { ...dto };
    if (dto.status === "paid" && !dto.paid_at) {
      changes.paid_at = new Date().toISOString().slice(0, 10);
    }

    const client = this.clientForUser(accessToken);
    const { data, error } = await client
      .from("fines")
      .update(changes)
      .eq("id", fineId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .select(FINE_COLUMNS)
      .maybeSingle();

    if (error || !data) {
      throw new NotFoundException("Multa não encontrada");
    }

    void this.auditService.log({
      userId,
      action: "FINE_UPDATED",
      tableName: "fines",
      recordId: fineId,
      changes,
    });

    const updated = data as Fine;
    if (updated.status === "cancelled") {
      await this.expensesService.softDeleteBySource(accessToken, userId, "fine", fineId);
    }

    return updated;
  }

  /**
   * @spec SPEC-20260607-001 RF-06, R5
   * @spec EPIC-FIN-001 R-HUB-01
   */
  async remove(accessToken: string, userId: string, fineId: string): Promise<void> {
    await this.findOne(accessToken, userId, fineId);

    const { error } = await this.clientForUser(accessToken)
      .from("fines")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", fineId)
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (error) {
      throw new NotFoundException("Não foi possível remover a multa");
    }

    void this.auditService.log({
      userId,
      action: "FINE_DELETED",
      tableName: "fines",
      recordId: fineId,
    });

    await this.expensesService.softDeleteBySource(accessToken, userId, "fine", fineId);
  }

  /**
   * @spec SPEC-20260607-001 RF-07
   */
  async countPending(accessToken: string, userId: string, vehicleId?: string): Promise<number> {
    let builder = this.clientForUser(accessToken)
      .from("fines")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "pending")
      .is("deleted_at", null);

    if (vehicleId) {
      builder = builder.eq("vehicle_id", vehicleId);
    }

    const { count, error } = await builder;
    if (error) {
      throw new NotFoundException("Não foi possível contar as multas pendentes");
    }
    return count ?? 0;
  }
}
