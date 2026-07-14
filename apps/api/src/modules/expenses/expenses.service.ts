import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AuditService } from "../../shared/audit/audit.service";
import { createUserScopedClient } from "../../shared/supabase/create-user-scoped-client";
import { SUPABASE_ADMIN_CLIENT } from "../../shared/supabase/supabase.constants";
import type { CreateExpenseDto } from "./dto/create-expense.dto";
import type { ListExpensesDto } from "./dto/list-expenses.dto";
import type { UpdateExpenseDto } from "./dto/update-expense.dto";

export interface Expense {
  id: string;
  user_id: string;
  vehicle_id: string;
  category: string;
  amount: number;
  date: string;
  description: string | null;
  odometer_km: number | null;
  liters: number | null;
  fuel_type: string | null;
  full_tank: boolean | null;
  supplier: string | null;
  source_type: string | null;
  source_id: string | null;
  is_readonly: boolean;
  created_at: string;
  updated_at: string;
}

export type ExpenseWithOdometerWarning = Expense & {
  odometer_warning?: true;
  odometer_previous_max_km?: number;
};

export type ExpenseWithWarnings = ExpenseWithOdometerWarning & {
  duplicate_warning?: true;
  duplicate_id?: string;
};

export interface PaginatedExpenses {
  data: Expense[];
  meta: { total: number; page: number; limit: number; has_next: boolean };
}

const EXPENSE_COLUMNS = `id, user_id, vehicle_id, category, amount, date, description, odometer_km,
  liters, fuel_type, full_tank, supplier, source_type, source_id, is_readonly, created_at, updated_at`;

/**
 * @spec SPEC-20260714-001
 */
@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);

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
   * @spec SPEC-20260601-001 RF-02
   */
  private async findMaxOdometerByVehicle(
    client: SupabaseClient,
    vehicleId: string,
    userId: string,
    excludeExpenseId?: string,
  ): Promise<number | null> {
    let builder = client
      .from("expenses")
      .select("odometer_km")
      .eq("vehicle_id", vehicleId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .not("odometer_km", "is", null);

    if (excludeExpenseId) {
      builder = builder.neq("id", excludeExpenseId);
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
   * @spec SPEC-20260601-001 RF-01, RF-03, RF-04, EC-05
   */
  private async buildOdometerWarning(
    client: SupabaseClient,
    userId: string,
    vehicleId: string,
    odometerKm: number | null | undefined,
    excludeExpenseId?: string,
  ): Promise<Pick<ExpenseWithOdometerWarning, "odometer_warning" | "odometer_previous_max_km">> {
    if (odometerKm == null) {
      return {};
    }

    try {
      const maxKm = await this.findMaxOdometerByVehicle(client, vehicleId, userId, excludeExpenseId);
      if (maxKm != null && odometerKm < maxKm) {
        return { odometer_warning: true, odometer_previous_max_km: maxKm };
      }
    } catch (err) {
      this.logger.error("Falha ao verificar sequência de odômetro", err as Error);
    }
    return {};
  }

  /**
   * @spec SPEC-20260601-002 RF-01
   * `excludeExpenseId` exclui o registro recém-criado da própria busca — sem essa exclusão,
   * a query encontraria o registro que acabou de ser inserido como "duplicata de si mesmo"
   * (RF-02 invoca a busca *após* o insert, então o novo registro sempre bate nos 4 critérios).
   */
  private async findPotentialDuplicate(
    client: SupabaseClient,
    userId: string,
    vehicleId: string,
    date: string,
    amount: number,
    category: string,
    excludeExpenseId: string,
  ): Promise<string | null> {
    const { data, error } = await client
      .from("expenses")
      .select("id")
      .eq("user_id", userId)
      .eq("vehicle_id", vehicleId)
      .eq("date", date)
      .eq("amount", amount)
      .eq("category", category)
      .is("deleted_at", null)
      .neq("id", excludeExpenseId)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }
    return (data as { id: string }).id;
  }

  /**
   * @spec SPEC-20260601-002 RF-02, RF-03, RF-04, EC-05
   */
  private async buildDuplicateWarning(
    client: SupabaseClient,
    userId: string,
    expense: Expense,
  ): Promise<Pick<ExpenseWithWarnings, "duplicate_warning" | "duplicate_id">> {
    try {
      const duplicateId = await this.findPotentialDuplicate(
        client,
        userId,
        expense.vehicle_id,
        expense.date,
        expense.amount,
        expense.category,
        expense.id,
      );
      if (duplicateId) {
        return { duplicate_warning: true, duplicate_id: duplicateId };
      }
    } catch (err) {
      this.logger.error("Falha ao verificar duplicata de despesa", err as Error);
    }
    return {};
  }

  /**
   * @spec SPEC-20260714-001 RF-01, RF-02, RF-09, RNF-04
   * @spec SPEC-20260601-001 RF-01, RF-03, RF-04
   * @spec SPEC-20260601-002 RF-02, RF-03, RF-04
   */
  async create(
    accessToken: string,
    userId: string,
    dto: CreateExpenseDto,
  ): Promise<ExpenseWithWarnings> {
    const client = this.clientForUser(accessToken);

    const { data: vehicle, error: vehicleError } = await client
      .from("vehicles")
      .select("id")
      .eq("id", dto.vehicle_id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (vehicleError || !vehicle) {
      throw new NotFoundException("Veículo não encontrado");
    }

    const { data, error } = await client
      .from("expenses")
      .insert({ ...dto, user_id: userId, is_readonly: false })
      .select(EXPENSE_COLUMNS)
      .single();

    if (error || !data) {
      throw new NotFoundException("Não foi possível criar a despesa");
    }

    void this.auditService.log({
      userId,
      action: "EXPENSE_CREATED",
      tableName: "expenses",
      recordId: (data as Expense).id,
    });

    const expense = data as Expense;
    const odometerWarning = await this.buildOdometerWarning(
      client,
      userId,
      expense.vehicle_id,
      dto.odometer_km,
    );
    const duplicateWarning = await this.buildDuplicateWarning(client, userId, expense);
    return { ...expense, ...odometerWarning, ...duplicateWarning };
  }

  /**
   * @spec SPEC-20260714-001 RF-03, RNF-01, P1
   */
  async findAll(
    accessToken: string,
    userId: string,
    query: ListExpensesDto,
  ): Promise<PaginatedExpenses> {
    const client = this.clientForUser(accessToken);
    const { page, limit, vehicle_id, category, date_from, date_to } = query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let builder = client
      .from("expenses")
      .select(EXPENSE_COLUMNS, { count: "exact" })
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (vehicle_id) {
      builder = builder.eq("vehicle_id", vehicle_id);
    }
    if (category) {
      builder = builder.eq("category", category);
    }
    if (date_from) {
      builder = builder.gte("date", date_from);
    }
    if (date_to) {
      builder = builder.lte("date", date_to);
    }

    const { data, error, count } = await builder
      .order("date", { ascending: false })
      .range(from, to);

    if (error) {
      throw new NotFoundException("Não foi possível listar as despesas");
    }

    const total = count ?? 0;
    return {
      data: (data ?? []) as Expense[],
      meta: { total, page, limit, has_next: from + (data?.length ?? 0) < total },
    };
  }

  /**
   * @spec SPEC-20260714-001 RF-04
   */
  async findOne(accessToken: string, userId: string, expenseId: string): Promise<Expense> {
    const { data, error } = await this.clientForUser(accessToken)
      .from("expenses")
      .select(EXPENSE_COLUMNS)
      .eq("id", expenseId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !data) {
      throw new NotFoundException("Despesa não encontrada");
    }
    return data as Expense;
  }

  /**
   * @spec SPEC-20260714-001 RF-05, RF-07, R-LED-01
   * @spec SPEC-20260601-001 RF-01, RF-03, RF-04, RF-05
   */
  async update(
    accessToken: string,
    userId: string,
    expenseId: string,
    dto: UpdateExpenseDto,
  ): Promise<ExpenseWithOdometerWarning> {
    const existing = await this.findOne(accessToken, userId, expenseId);
    if (existing.is_readonly) {
      throw new ForbiddenException("Despesa vinculada ao ledger não pode ser editada");
    }

    const client = this.clientForUser(accessToken);
    const { data, error } = await client
      .from("expenses")
      .update(dto)
      .eq("id", expenseId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .select(EXPENSE_COLUMNS)
      .maybeSingle();

    if (error || !data) {
      throw new NotFoundException("Despesa não encontrada");
    }

    void this.auditService.log({
      userId,
      action: "EXPENSE_UPDATED",
      tableName: "expenses",
      recordId: expenseId,
      changes: dto,
    });

    const expense = data as Expense;
    const warning = await this.buildOdometerWarning(
      client,
      userId,
      expense.vehicle_id,
      dto.odometer_km,
      expenseId,
    );
    return { ...expense, ...warning };
  }

  /**
   * @spec SPEC-20260714-001 RF-06, RF-07, R-LED-01, R5
   */
  async remove(accessToken: string, userId: string, expenseId: string): Promise<void> {
    const existing = await this.findOne(accessToken, userId, expenseId);
    if (existing.is_readonly) {
      throw new ForbiddenException("Despesa vinculada ao ledger não pode ser removida");
    }

    const { error } = await this.clientForUser(accessToken)
      .from("expenses")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", expenseId)
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (error) {
      throw new NotFoundException("Não foi possível remover a despesa");
    }

    void this.auditService.log({
      userId,
      action: "EXPENSE_DELETED",
      tableName: "expenses",
      recordId: expenseId,
    });
  }
}
