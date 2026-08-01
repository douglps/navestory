import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  RECURRING_COST_TYPE_LABEL,
  RECURRING_COST_TYPE_TO_CATEGORY,
  type RecurringCost,
} from "@navestory/validators";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AuditService } from "../../shared/audit/audit.service";
import { createUserScopedClient } from "../../shared/supabase/create-user-scoped-client";
import { SUPABASE_ADMIN_CLIENT } from "../../shared/supabase/supabase.constants";
import { ExpensesService } from "../expenses/expenses.service";
import type { CreateRecurringCostDto } from "./dto/create-recurring-cost.dto";
import type { ListRecurringCostsDto } from "./dto/list-recurring-costs.dto";
import type { UpdateRecurringCostDto } from "./dto/update-recurring-cost.dto";

const RECURRING_COST_COLUMNS = `id, user_id, vehicle_id, cost_type, year, amount, due_date, paid_at,
  expense_id, notes, created_at, updated_at`;

/**
 * @spec SPEC-20260609-001
 */
@Injectable()
export class RecurringCostsService {
  constructor(
    @Inject(SUPABASE_ADMIN_CLIENT)
    private readonly supabaseAdmin: SupabaseClient,
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
   * @spec SPEC-20260609-001 RF-02, R-REC-01
   * A checagem não filtra `deleted_at` — a constraint `uq_vehicle_recurring_cost` no banco também
   * não é parcial, então um registro soft-deletado ainda ocupa a combinação (vehicle_id, cost_type, year).
   */
  private async assertNoDuplicate(
    client: SupabaseClient,
    vehicleId: string,
    costType: string,
    year: number,
  ): Promise<void> {
    const { data } = await client
      .from("vehicle_recurring_costs")
      .select("id")
      .eq("vehicle_id", vehicleId)
      .eq("cost_type", costType)
      .eq("year", year)
      .maybeSingle();

    if (data) {
      throw new ConflictException(
        "Já existe um registro ativo para este veículo, tipo e ano.",
      );
    }
  }

  /**
   * @spec SPEC-20260609-001 RF-02, RF-03, R-LED-05
   */
  private async linkToLedger(
    accessToken: string,
    userId: string,
    recurringCost: RecurringCost,
  ): Promise<RecurringCost> {
    const expense = await this.expensesService.createFromSource(
      accessToken,
      userId,
      {
        source_type: "recurring_cost",
        source_id: recurringCost.id,
        vehicle_id: recurringCost.vehicle_id,
        category: RECURRING_COST_TYPE_TO_CATEGORY[recurringCost.cost_type],
        amount: recurringCost.amount,
        date: recurringCost.paid_at as string,
        description: `${RECURRING_COST_TYPE_LABEL[recurringCost.cost_type]} ${recurringCost.year}`,
      },
    );

    const { data, error } = await this.clientForUser(accessToken)
      .from("vehicle_recurring_costs")
      .update({ expense_id: expense.id })
      .eq("id", recurringCost.id)
      .eq("user_id", userId)
      .select(RECURRING_COST_COLUMNS)
      .maybeSingle();

    if (error || !data) {
      return recurringCost;
    }
    return data as RecurringCost;
  }

  /**
   * @spec SPEC-20260609-001 RF-01
   */
  async findAll(
    accessToken: string,
    userId: string,
    query: ListRecurringCostsDto,
  ): Promise<RecurringCost[]> {
    let builder = this.clientForUser(accessToken)
      .from("vehicle_recurring_costs")
      .select(RECURRING_COST_COLUMNS)
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (query.vehicle_id) {
      builder = builder.eq("vehicle_id", query.vehicle_id);
    }
    if (query.year) {
      builder = builder.eq("year", query.year);
    }
    if (query.cost_type) {
      builder = builder.eq("cost_type", query.cost_type);
    }
    if (query.paid === true) {
      builder = builder.not("paid_at", "is", null);
    } else if (query.paid === false) {
      builder = builder.is("paid_at", null);
    }

    const { data, error } = await builder.order("due_date", {
      ascending: true,
    });

    if (error) {
      throw new NotFoundException(
        "Não foi possível listar os custos recorrentes",
      );
    }
    return (data ?? []) as RecurringCost[];
  }

  /**
   * @spec SPEC-20260609-001 RF-05
   */
  async findOne(
    accessToken: string,
    userId: string,
    id: string,
  ): Promise<RecurringCost> {
    const { data, error } = await this.clientForUser(accessToken)
      .from("vehicle_recurring_costs")
      .select(RECURRING_COST_COLUMNS)
      .eq("id", id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !data) {
      throw new NotFoundException("Custo recorrente não encontrado");
    }
    return data as RecurringCost;
  }

  /**
   * @spec SPEC-20260609-001 RF-02
   */
  async create(
    accessToken: string,
    userId: string,
    dto: CreateRecurringCostDto,
  ): Promise<RecurringCost> {
    const client = this.clientForUser(accessToken);
    await this.assertVehicleOwnership(client, dto.vehicle_id, userId);
    await this.assertNoDuplicate(
      client,
      dto.vehicle_id,
      dto.cost_type,
      dto.year,
    );

    const { data, error } = await client
      .from("vehicle_recurring_costs")
      .insert({ ...dto, user_id: userId })
      .select(RECURRING_COST_COLUMNS)
      .single();

    if (error || !data) {
      throw new NotFoundException("Não foi possível criar o custo recorrente");
    }

    void this.auditService.log({
      userId,
      action: "RECURRING_COST_CREATED",
      tableName: "vehicle_recurring_costs",
      recordId: (data as RecurringCost).id,
    });

    const recurringCost = data as RecurringCost;
    if (recurringCost.paid_at) {
      return this.linkToLedger(accessToken, userId, recurringCost);
    }
    return recurringCost;
  }

  /**
   * @spec SPEC-20260609-001 RF-03
   */
  async update(
    accessToken: string,
    userId: string,
    id: string,
    dto: UpdateRecurringCostDto,
  ): Promise<RecurringCost> {
    const existing = await this.findOne(accessToken, userId, id);

    const client = this.clientForUser(accessToken);
    const { data, error } = await client
      .from("vehicle_recurring_costs")
      .update(dto)
      .eq("id", id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .select(RECURRING_COST_COLUMNS)
      .maybeSingle();

    if (error || !data) {
      throw new NotFoundException("Custo recorrente não encontrado");
    }

    void this.auditService.log({
      userId,
      action: "RECURRING_COST_UPDATED",
      tableName: "vehicle_recurring_costs",
      recordId: id,
      changes: dto,
    });

    const updated = data as RecurringCost;
    const isPayingNow = existing.paid_at == null && updated.paid_at != null;
    if (isPayingNow) {
      return this.linkToLedger(accessToken, userId, updated);
    }
    return updated;
  }

  /**
   * @spec SPEC-20260609-001 RF-04, R-HUB-01, R5
   */
  async remove(accessToken: string, userId: string, id: string): Promise<void> {
    await this.findOne(accessToken, userId, id);

    const { error } = await this.clientForUser(accessToken)
      .from("vehicle_recurring_costs")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (error) {
      throw new NotFoundException(
        "Não foi possível remover o custo recorrente",
      );
    }

    void this.auditService.log({
      userId,
      action: "RECURRING_COST_DELETED",
      tableName: "vehicle_recurring_costs",
      recordId: id,
    });

    await this.expensesService.softDeleteBySource(
      accessToken,
      userId,
      "recurring_cost",
      id,
    );
  }
}
