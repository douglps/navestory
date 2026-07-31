import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ConsolidatedExportQuery, ExpenseKpis, UpcomingCostItem } from "@nave/validators";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AuditService } from "../../shared/audit/audit.service";
import { escapeCsvField } from "../../shared/csv/csv.util";
import { createUserScopedClient } from "../../shared/supabase/create-user-scoped-client";
import { SUPABASE_ADMIN_CLIENT } from "../../shared/supabase/supabase.constants";
import {
  FALLBACK_TIMEZONE,
  exclusiveDayUpperBoundUtc,
  resolveDateTimeInput,
  toCalendarDay,
} from "../../shared/utils/date.utils";
import { PreferencesService } from "../preferences/preferences.service";
import type { CreateExpenseDto } from "./dto/create-expense.dto";
import type { ExpenseKpisDto } from "./dto/expense-kpis.dto";
import type { ListExpensesDto } from "./dto/list-expenses.dto";
import type { UpcomingCostsDto } from "./dto/upcoming-costs.dto";
import type { UpdateExpenseDto } from "./dto/update-expense.dto";

export interface Expense {
  id: string;
  user_id: string;
  vehicle_id: string;
  category: string;
  amount: number;
  occurred_at: string;
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
  computed?: { km_per_liter: number | null; price_per_liter: number | null };
};

export type ExpenseWithWarnings = ExpenseWithOdometerWarning & {
  duplicate_warning?: true;
  duplicate_id?: string;
  /** @spec SPEC-20260715-002 RF-BK-09, R-TZ-04 — aviso não-bloqueante, nunca impede a criação */
  future_date_warning?: true;
};

export interface PaginatedExpenses {
  data: Expense[];
  meta: { total: number; page: number; limit: number; has_next: boolean };
}

const EXPENSE_COLUMNS = `id, user_id, vehicle_id, category, amount, occurred_at, description, odometer_km,
  liters, fuel_type, full_tank, supplier, source_type, source_id, is_readonly, created_at, updated_at`;

const SUPPLIER_SUGGESTION_LIMIT = 10;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

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
    private readonly preferencesService: PreferencesService,
  ) {}

  private clientForUser(accessToken: string): SupabaseClient {
    return createUserScopedClient(
      this.configService.getOrThrow<string>("SUPABASE_URL"),
      this.configService.getOrThrow<string>("SUPABASE_ANON_KEY"),
      accessToken,
    );
  }

  /** @spec SPEC-20260715-002 R-TZ-01, RF-BK-05 — fallback nomeado, nunca o fuso do processo */
  private async resolveUserTimezone(accessToken: string, userId: string): Promise<string> {
    const preferences = await this.preferencesService.findOne(accessToken, userId);
    return preferences.timezone ?? FALLBACK_TIMEZONE;
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
   * @spec SPEC-20260612-001 RF-04.1
   */
  private async findOdometerBoundary(
    client: SupabaseClient,
    vehicleId: string,
    userId: string,
    direction: "before" | "after",
    occurredAt: string,
    excludeExpenseId?: string,
  ): Promise<{ odometer_km: number; occurred_at: string } | null> {
    let builder = client
      .from("expenses")
      .select("odometer_km, occurred_at")
      .eq("vehicle_id", vehicleId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .not("odometer_km", "is", null);

    builder =
      direction === "before"
        ? builder.lte("occurred_at", occurredAt)
        : builder.gt("occurred_at", occurredAt);
    if (excludeExpenseId) {
      builder = builder.neq("id", excludeExpenseId);
    }

    const { data, error } = await builder
      .order("odometer_km", { ascending: direction === "after" })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }
    return data as { odometer_km: number; occurred_at: string };
  }

  /**
   * @spec SPEC-20260612-001 RF-04.1, RF-04.2
   * R-ODO-01: validação rígida (hard block), opt-in via `strict` — usada exclusivamente pelo
   * fluxo web (apps/web envia `?strict=true`); o default preserva o soft-warning R1
   * (SPEC-20260601-001) para os demais consumidores da API.
   */
  private async checkOdometerHardBlock(
    client: SupabaseClient,
    userId: string,
    vehicleId: string,
    occurredAt: string,
    odometerKm: number | null | undefined,
    excludeExpenseId?: string,
  ): Promise<void> {
    if (odometerKm == null) return;

    const before = await this.findOdometerBoundary(
      client,
      vehicleId,
      userId,
      "before",
      occurredAt,
      excludeExpenseId,
    );
    if (before && odometerKm < before.odometer_km) {
      throw new BadRequestException(
        `Odômetro inválido: o último valor registrado para este veículo foi ${before.odometer_km} km em ${before.occurred_at}. Informe um valor igual ou maior.`,
      );
    }

    const after = await this.findOdometerBoundary(
      client,
      vehicleId,
      userId,
      "after",
      occurredAt,
      excludeExpenseId,
    );
    if (after && odometerKm > after.odometer_km) {
      throw new BadRequestException(
        `Odômetro inválido: existe um registro de ${after.odometer_km} km em ${after.occurred_at}, posterior a esta despesa. Informe um valor igual ou menor.`,
      );
    }
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
  /**
   * @spec SPEC-20260715-002 RF-BK-08, R2 v2
   * "Mesma data" passa a significar mesmo dia calendário no fuso do usuário — não igualdade de
   * `timestamptz`. O intervalo `[início do dia, início do dia seguinte)` no fuso `tz` é convertido
   * para UTC antes de filtrar, mantendo a comparação no banco (sem carregar candidatos em memória).
   */
  private async findPotentialDuplicate(
    client: SupabaseClient,
    userId: string,
    vehicleId: string,
    occurredAt: string,
    tz: string,
    amount: number,
    category: string,
    excludeExpenseId: string,
  ): Promise<string | null> {
    const calendarDay = toCalendarDay(new Date(occurredAt), tz);
    const dayStartUtc = resolveDateTimeInput(calendarDay, tz);
    const dayEndUtc = new Date(new Date(dayStartUtc).getTime() + 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await client
      .from("expenses")
      .select("id")
      .eq("user_id", userId)
      .eq("vehicle_id", vehicleId)
      .gte("occurred_at", dayStartUtc)
      .lt("occurred_at", dayEndUtc)
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
   * @spec SPEC-20260715-002 RF-BK-08
   */
  private async buildDuplicateWarning(
    client: SupabaseClient,
    userId: string,
    expense: Expense,
    tz: string,
  ): Promise<Pick<ExpenseWithWarnings, "duplicate_warning" | "duplicate_id">> {
    try {
      const duplicateId = await this.findPotentialDuplicate(
        client,
        userId,
        expense.vehicle_id,
        expense.occurred_at,
        tz,
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
   * @spec SPEC-20260606-001 RF-03, R-FUEL-02, R-FUEL-03
   * `excludeExpenseId` reutiliza a busca de `findMaxOdometerByVehicle` já usada pela validação de
   * odômetro (SPEC-20260601-001) — sem query adicional, conforme RNF de SPEC-20260606-001.
   */
  private async computeFuelMetrics(
    client: SupabaseClient,
    userId: string,
    expense: Expense,
  ): Promise<Pick<ExpenseWithOdometerWarning, "computed">> {
    if (expense.category !== "fuel") {
      return {};
    }

    const priceperLiter =
      expense.liters != null && expense.liters > 0 ? round2(expense.amount / expense.liters) : null;

    let kmPerLiter: number | null = null;
    if (expense.full_tank === true && expense.liters != null && expense.liters > 0 && expense.odometer_km != null) {
      const maxPrevKm = await this.findMaxOdometerByVehicle(
        client,
        expense.vehicle_id,
        userId,
        expense.id,
      );
      if (maxPrevKm != null) {
        kmPerLiter = round2((expense.odometer_km - maxPrevKm) / expense.liters);
      }
    }

    return { computed: { km_per_liter: kmPerLiter, price_per_liter: priceperLiter } };
  }

  /**
   * @spec SPEC-20260606-002 RF-02
   * Sugestões deduplicadas case-insensitive em memória (histórico do usuário é pequeno o bastante
   * para não justificar DISTINCT no banco); mantém a capitalização original mais recente (R-FUEL-04).
   */
  async listSuppliers(accessToken: string, userId: string): Promise<string[]> {
    const { data, error } = await this.clientForUser(accessToken)
      .from("expenses")
      .select("supplier, occurred_at")
      .eq("user_id", userId)
      .not("supplier", "is", null)
      .is("deleted_at", null)
      .order("occurred_at", { ascending: false })
      .limit(200);

    if (error) {
      this.logger.error("Falha ao listar fornecedores", error.message);
      throw new InternalServerErrorException("Não foi possível listar os fornecedores");
    }

    const seen = new Set<string>();
    const suppliers: string[] = [];
    for (const row of (data ?? []) as { supplier: string }[]) {
      const key = row.supplier.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        suppliers.push(row.supplier);
        if (suppliers.length >= SUPPLIER_SUGGESTION_LIMIT) break;
      }
    }
    return suppliers;
  }

  /**
   * @spec SPEC-20260714-001 RF-01, RF-02, RF-09, RNF-04
   * @spec SPEC-20260601-001 RF-01, RF-03, RF-04
   * @spec SPEC-20260601-002 RF-02, RF-03, RF-04
   * @spec SPEC-20260606-001 RF-03
   */
  async create(
    accessToken: string,
    userId: string,
    dto: CreateExpenseDto,
    strict = false,
  ): Promise<ExpenseWithWarnings> {
    const client = this.clientForUser(accessToken);

    const { data: vehicle, error: vehicleError } = await client
      .from("vehicles")
      .select("id")
      .eq("id", dto.vehicle_id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (vehicleError) {
      this.logger.error("Falha ao verificar veículo antes de criar despesa", vehicleError.message);
      throw new InternalServerErrorException("Não foi possível verificar o veículo");
    }
    if (!vehicle) {
      throw new NotFoundException("Veículo não encontrado");
    }

    // valida R4 — guard imperativo no service (schema Zod do controller pode ser
    // contornado por chamadas diretas ao service, ex: createFromSource)
    if (dto.category === "fuel" && dto.odometer_km == null) {
      throw new BadRequestException(
        "odometer_km é obrigatório para despesas de categoria fuel",
      );
    }

    const tz = await this.resolveUserTimezone(accessToken, userId);
    const occurredAt = resolveDateTimeInput(dto.occurred_at, tz);

    if (strict) {
      await this.checkOdometerHardBlock(client, userId, dto.vehicle_id, occurredAt, dto.odometer_km);
    }

    const { data, error } = await client
      .from("expenses")
      .insert({ ...dto, occurred_at: occurredAt, user_id: userId, is_readonly: false })
      .select(EXPENSE_COLUMNS)
      .single();

    if (error || !data) {
      this.logger.error("Falha ao criar despesa", error?.message);
      throw new InternalServerErrorException("Não foi possível criar a despesa");
    }

    void this.auditService.log({
      userId,
      action: "EXPENSE_CREATED",
      tableName: "expenses",
      recordId: (data as Expense).id,
    });

    const expense = data as Expense;
    const odometerWarning = strict
      ? {}
      : await this.buildOdometerWarning(client, userId, expense.vehicle_id, dto.odometer_km);
    const duplicateWarning = await this.buildDuplicateWarning(client, userId, expense, tz);
    const fuelMetrics = await this.computeFuelMetrics(client, userId, expense);
    // @spec SPEC-20260715-002 RF-BK-09, R-TZ-04 — aviso não-bloqueante quando o dia calendário
    // (fuso do usuário) da despesa é posterior ao dia calendário corrente
    const futureDateWarning: Pick<ExpenseWithWarnings, "future_date_warning"> =
      toCalendarDay(new Date(occurredAt), tz) > toCalendarDay(new Date(), tz)
        ? { future_date_warning: true }
        : {};
    return { ...expense, ...odometerWarning, ...duplicateWarning, ...fuelMetrics, ...futureDateWarning };
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
      builder = builder.gte("occurred_at", date_from);
    }
    if (date_to) {
      builder = builder.lt("occurred_at", exclusiveDayUpperBoundUtc(date_to));
    }

    const { data, error, count } = await builder
      .order("occurred_at", { ascending: false })
      .range(from, to);

    if (error) {
      this.logger.error("Falha ao listar despesas", error.message);
      throw new InternalServerErrorException("Não foi possível listar as despesas");
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

    if (error) {
      this.logger.error("Falha ao buscar despesa", error.message);
      throw new InternalServerErrorException("Não foi possível buscar a despesa");
    }
    if (!data) {
      throw new NotFoundException("Despesa não encontrada");
    }
    return data as Expense;
  }

  /**
   * @spec SPEC-20260714-001 RF-05, RF-07, R-LED-01
   * @spec SPEC-20260601-001 RF-01, RF-03, RF-04, RF-05
   * @spec SPEC-20260606-001 RF-03
   */
  async update(
    accessToken: string,
    userId: string,
    expenseId: string,
    dto: UpdateExpenseDto,
    strict = false,
  ): Promise<ExpenseWithOdometerWarning> {
    const existing = await this.findOne(accessToken, userId, expenseId);
    if (existing.is_readonly) {
      throw new ForbiddenException("Despesa vinculada ao ledger não pode ser editada");
    }

    const client = this.clientForUser(accessToken);
    const tz = await this.resolveUserTimezone(accessToken, userId);
    const resolvedOccurredAt =
      dto.occurred_at !== undefined ? resolveDateTimeInput(dto.occurred_at, tz) : undefined;

    if (strict && dto.odometer_km !== undefined) {
      await this.checkOdometerHardBlock(
        client,
        userId,
        existing.vehicle_id,
        resolvedOccurredAt ?? existing.occurred_at,
        dto.odometer_km,
        expenseId,
      );
    }

    const { data, error } = await client
      .from("expenses")
      .update({ ...dto, ...(resolvedOccurredAt !== undefined ? { occurred_at: resolvedOccurredAt } : {}) })
      .eq("id", expenseId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .select(EXPENSE_COLUMNS)
      .maybeSingle();

    if (error) {
      this.logger.error("Falha ao atualizar despesa", error.message);
      throw new InternalServerErrorException("Não foi possível atualizar a despesa");
    }
    if (!data) {
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
    const warning = strict
      ? {}
      : await this.buildOdometerWarning(client, userId, expense.vehicle_id, dto.odometer_km, expenseId);
    const fuelMetrics = await this.computeFuelMetrics(client, userId, expense);
    return { ...expense, ...warning, ...fuelMetrics };
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
      this.logger.error("Falha ao remover despesa", error.message);
      throw new InternalServerErrorException("Não foi possível remover a despesa");
    }

    void this.auditService.log({
      userId,
      action: "EXPENSE_DELETED",
      tableName: "expenses",
      recordId: expenseId,
    });
  }

  /**
   * @spec SPEC-20260608-001 RF-01, RF-02, RF-03, RNF-02
   * @spec SPEC-20260721-002 RF-09, P6 — `query.limit` aplica `.limit()` no builder do RPC
   * (PostgREST), nunca corta o array em memória depois de recebido.
   */
  async getUpcomingCosts(
    accessToken: string,
    query: UpcomingCostsDto,
  ): Promise<UpcomingCostItem[]> {
    const builder = this.clientForUser(accessToken).rpc("get_upcoming_costs", {
      p_vehicle_id: query.vehicle_id ?? null,
      p_horizon_days: query.horizon_days,
    });
    const { data, error } = await (query.limit ? builder.limit(query.limit) : builder);

    if (error) {
      this.logger.error("Falha ao carregar próximas despesas", error.message);
      throw new InternalServerErrorException("Não foi possível carregar as próximas despesas");
    }
    return (data ?? []) as UpcomingCostItem[];
  }

  private async sumExpensesAmount(
    client: SupabaseClient,
    userId: string,
    vehicleId: string | undefined,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<number> {
    let builder = client
      .from("expenses")
      .select("amount")
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (vehicleId) {
      builder = builder.eq("vehicle_id", vehicleId);
    }
    if (dateFrom) {
      builder = builder.gte("occurred_at", dateFrom);
    }
    if (dateTo) {
      builder = builder.lt("occurred_at", dateTo);
    }

    const { data, error } = await builder;
    if (error) {
      this.logger.error("Falha ao calcular KPIs financeiros", error.message);
      throw new InternalServerErrorException("Não foi possível calcular os KPIs financeiros");
    }
    return round2(((data ?? []) as { amount: number }[]).reduce((sum, row) => sum + row.amount, 0));
  }

  /**
   * @spec SPEC-20260608-002 RF-01, RF-02, RF-03
   * @spec SPEC-20260715-002 R-TZ-01 — limites de mês calculados no fuso do usuário, não no
   * calendário local do processo Node.js (mesma classe de bug corrigida em `DashboardService`).
   */
  async getKpis(accessToken: string, userId: string, query: ExpenseKpisDto): Promise<ExpenseKpis> {
    const client = this.clientForUser(accessToken);
    const tz = await this.resolveUserTimezone(accessToken, userId);
    const todayInTz = toCalendarDay(new Date(), tz);
    const [year, month] = todayInTz.split("-").map(Number) as [number, number];
    const monthStart = (offset: number) => {
      const d = new Date(Date.UTC(year, month - 1 + offset, 1));
      return resolveDateTimeInput(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`, tz);
    };
    const startOfThisMonth = monthStart(0);
    const startOfNextMonth = monthStart(1);
    const startOfPrevMonth = monthStart(-1);

    const [totalThisMonth, totalPrevMonth, totalAllTime, upcoming] = await Promise.all([
      this.sumExpensesAmount(client, userId, query.vehicle_id, startOfThisMonth, startOfNextMonth),
      this.sumExpensesAmount(client, userId, query.vehicle_id, startOfPrevMonth, startOfThisMonth),
      this.sumExpensesAmount(client, userId, query.vehicle_id),
      this.getUpcomingCosts(accessToken, { vehicle_id: query.vehicle_id, horizon_days: 30 }),
    ]);

    const deltaPercent =
      totalPrevMonth === 0
        ? null
        : Math.round(((totalThisMonth - totalPrevMonth) / totalPrevMonth) * 1000) / 10;

    return {
      total_this_month: totalThisMonth,
      total_prev_month: totalPrevMonth,
      delta_percent: deltaPercent,
      total_all_time: totalAllTime,
      upcoming_30_days_total: round2(
        upcoming.reduce((sum, item) => sum + (item.amount ?? 0), 0),
      ),
      upcoming_30_days_count: upcoming.length,
    };
  }

  /**
   * @spec EPIC-FIN-001 R-LED-02, R-LED-05, R-HUB-02
   * Idempotente via checagem prévia (mesma técnica de `findPotentialDuplicate`) — a idempotência
   * definitiva é garantida pelo índice único parcial `uq_expenses_source` no banco.
   */
  async createFromSource(
    accessToken: string,
    userId: string,
    params: {
      source_type: string;
      source_id: string;
      vehicle_id: string;
      category: string;
      amount: number;
      date: string;
      description?: string | null;
    },
  ): Promise<Expense> {
    const client = this.clientForUser(accessToken);

    const { data: existing } = await client
      .from("expenses")
      .select(EXPENSE_COLUMNS)
      .eq("source_type", params.source_type)
      .eq("source_id", params.source_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (existing) {
      return existing as Expense;
    }

    const { data, error } = await client
      .from("expenses")
      .insert({
        user_id: userId,
        vehicle_id: params.vehicle_id,
        category: params.category,
        amount: params.amount,
        occurred_at: params.date,
        description: params.description ?? null,
        source_type: params.source_type,
        source_id: params.source_id,
        is_readonly: true,
      })
      .select(EXPENSE_COLUMNS)
      .single();

    if (error || !data) {
      this.logger.error("Falha ao vincular despesa ao ledger", error?.message);
      throw new InternalServerErrorException("Não foi possível vincular a despesa ao ledger");
    }

    void this.auditService.log({
      userId,
      action: "EXPENSE_CREATED",
      tableName: "expenses",
      recordId: (data as Expense).id,
      changes: { source_type: params.source_type, source_id: params.source_id },
    });

    return data as Expense;
  }

  /**
   * @spec EPIC-FIN-001 R-HUB-01
   */
  async softDeleteBySource(
    accessToken: string,
    userId: string,
    sourceType: string,
    sourceId: string,
  ): Promise<void> {
    const { error } = await this.clientForUser(accessToken)
      .from("expenses")
      .update({ deleted_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("source_type", sourceType)
      .eq("source_id", sourceId)
      .is("deleted_at", null);

    if (error) {
      this.logger.error("Falha ao remover despesa vinculada", error.message);
      throw new InternalServerErrorException("Não foi possível remover a despesa vinculada");
    }
  }

  private csvOriginLabel(sourceType: string | null): string {
    switch (sourceType) {
      case "maintenance":
        return "Manutenção";
      case "fine":
        return "Multa";
      case "recurring_cost":
        return "Documento";
      default:
        return "Despesa Manual";
    }
  }

  /**
   * @spec SPEC-20260609-003 RF-01, RF-02
   * Retorna CSV pronto (mesmo padrão de `DashboardService.exportExpensesCsv`) em vez do array JSON
   * literal da spec — mantém a arquitetura já estabelecida (backend gera o arquivo, frontend baixa
   * via `<a href download>`), sem introduzir fetch direto ao Supabase no cliente.
   */
  async exportConsolidatedCsv(
    accessToken: string,
    userId: string,
    query: ConsolidatedExportQuery,
  ): Promise<string> {
    const client = this.clientForUser(accessToken);
    const today = new Date();
    const toDateString = (date: Date) => date.toISOString().slice(0, 10);
    const from = query.from ?? toDateString(new Date(today.getFullYear(), today.getMonth() - 12, today.getDate()));
    const to = query.to ?? toDateString(today);

    let builder = client
      .from("expenses")
      .select("occurred_at, amount, category, description, source_type, vehicles(plate, make, model)")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .gte("occurred_at", from)
      .lt("occurred_at", exclusiveDayUpperBoundUtc(to));

    if (query.vehicle_id) {
      builder = builder.eq("vehicle_id", query.vehicle_id);
    }

    const header = "Data,Veiculo,Placa,Categoria,Valor,Origem,Descricao";
    const { data, error } = await builder.order("occurred_at", { ascending: false }).limit(5_000);

    if (error) {
      return `${header}\n`;
    }

    interface ConsolidatedExportRow {
      occurred_at: string;
      amount: number;
      category: string;
      description: string | null;
      source_type: string | null;
      vehicles:
        | { plate: string; make: string | null; model: string | null }
        | { plate: string; make: string | null; model: string | null }[]
        | null;
    }

    const rows = ((data ?? []) as ConsolidatedExportRow[]).map((row) => {
      const vehicle = (Array.isArray(row.vehicles) ? row.vehicles[0] : row.vehicles) ?? {
        plate: "",
        make: null,
        model: null,
      };
      return [
        row.occurred_at.slice(0, 10),
        escapeCsvField(`${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim()),
        escapeCsvField(vehicle.plate),
        escapeCsvField(row.category),
        row.amount.toFixed(2),
        this.csvOriginLabel(row.source_type),
        escapeCsvField(row.description ?? ""),
      ].join(",");
    });

    return [header, ...rows].join("\n") + "\n";
  }
}
