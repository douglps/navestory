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
import {
  RECEIPT_ALLOWED_MIME_TYPES,
  RECEIPT_MAX_SIZE_BYTES,
  RECEIPT_MIME_EXTENSION,
  type ConsolidatedExportQuery,
  type ExpenseKpis,
  type FuelStats,
  type ReceiptMimeType,
  type ReceiptUrls,
  type SupplierSuggestion,
  type UpcomingCostItem,
} from "@navestory/validators";
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
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
  /** @spec SPEC-20260814-004 RF-01, RF-09 */
  receipt_storage_key: string | null;
  receipt_uploaded_at: string | null;
  receipt_thumbnail_key: string | null;
  receipt_thumbnail_status:
    | "not_applicable"
    | "pending"
    | "completed"
    | "failed";
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
  liters, fuel_type, full_tank, supplier, source_type, source_id, is_readonly,
  receipt_storage_key, receipt_uploaded_at, receipt_thumbnail_key, receipt_thumbnail_status,
  created_at, updated_at`;

/** @spec SPEC-20260814-004 R-RCP-06 */
const RECEIPTS_BUCKET = "receipts";
/** @spec SPEC-20260814-004 RNF-03 */
const RECEIPT_SIGNED_URL_TTL_SECONDS = 60 * 60;
/** @spec SPEC-20260814-004 RF-05 */
const RECEIPT_THUMBNAIL_MAX_DIMENSION = 400;
const RECEIPT_THUMBNAIL_JPEG_QUALITY = 80;

/** @spec SPEC-20260814-003 RF-05, RF-09, RF-02, RF-03 */
const SUPPLIER_SUGGESTION_LIMIT = 10;
const SUPPLIER_SUGGESTION_LIMIT_EMPTY_QUERY = 5;
const WORKSPACE_SUPPLIER_LIMIT = 5;
const SUPPLIER_HISTORY_ROW_LIMIT = 500;

/** @spec SPEC-20260814-002 R-FUEL-11 */
const FUEL_STATS_MIN_RECORDS = 3;
/**
 * @spec SPEC-20260814-002
 * Reavaliar se um usuário atingir > 500 abastecimentos de combustível: a query é ordenada por
 * `occurred_at ASC`, então o corte passa a excluir os registros mais recentes, tornando as
 * médias de anomalia (R-FUEL-11) progressivamente desatualizadas.
 */
const FUEL_STATS_ROW_LIMIT = 500;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * @spec SPEC-20260814-003 RF-06, R-SUGG-02
 * @spec SPEC-20260619-001 R-SAN-01, R-SAN-02
 */
function normalizeSupplierKey(value: string): string {
  return value.trim().normalize("NFC").toLowerCase();
}

/**
 * @spec SPEC-20260714-001
 */
@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);

  constructor(
    @Inject(SUPABASE_ADMIN_CLIENT)
    private readonly supabaseAdmin: SupabaseClient,
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
  private async resolveUserTimezone(
    accessToken: string,
    userId: string,
  ): Promise<string> {
    const preferences = await this.preferencesService.findOne(
      accessToken,
      userId,
    );
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
  ): Promise<
    Pick<
      ExpenseWithOdometerWarning,
      "odometer_warning" | "odometer_previous_max_km"
    >
  > {
    if (odometerKm == null) {
      return {};
    }

    try {
      const maxKm = await this.findMaxOdometerByVehicle(
        client,
        vehicleId,
        userId,
        excludeExpenseId,
      );
      if (maxKm != null && odometerKm < maxKm) {
        return { odometer_warning: true, odometer_previous_max_km: maxKm };
      }
    } catch (err) {
      this.logger.error(
        "Falha ao verificar sequência de odômetro",
        err as Error,
      );
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
    const dayEndUtc = new Date(
      new Date(dayStartUtc).getTime() + 24 * 60 * 60 * 1000,
    ).toISOString();

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
      this.logger.error(
        "Falha ao verificar duplicata de despesa",
        err as Error,
      );
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
      expense.liters != null && expense.liters > 0
        ? round2(expense.amount / expense.liters)
        : null;

    let kmPerLiter: number | null = null;
    if (
      expense.full_tank === true &&
      expense.liters != null &&
      expense.liters > 0 &&
      expense.odometer_km != null
    ) {
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

    return {
      computed: { km_per_liter: kmPerLiter, price_per_liter: priceperLiter },
    };
  }

  /**
   * @spec SPEC-20260814-003 RF-02, RF-06, RF-09, R-SUGG-02
   * Histórico pessoal deduplicado em memória (mesmo racional do R-SUGG-01 original: volume por
   * usuário é pequeno o bastante para não justificar DISTINCT no banco — ver Notas Técnicas da
   * spec). Forma canônica = primeira ocorrência cronológica (`MIN(occurred_at)`); ordenação da
   * lista = uso mais recente (`MAX(occurred_at) DESC)`).
   */
  private async findPersonalSupplierSuggestions(
    accessToken: string,
    userId: string,
    normalizedQuery: string,
  ): Promise<SupplierSuggestion[]> {
    const { data, error } = await this.clientForUser(accessToken)
      .from("expenses")
      .select("supplier, occurred_at")
      .eq("user_id", userId)
      .eq("category", "fuel")
      .not("supplier", "is", null)
      .is("deleted_at", null)
      .order("occurred_at", { ascending: true })
      .limit(SUPPLIER_HISTORY_ROW_LIMIT);

    if (error) {
      this.logger.error("Falha ao listar fornecedores", error.message);
      throw new InternalServerErrorException(
        "Não foi possível listar os fornecedores",
      );
    }

    const byKey = new Map<string, { canonical: string; lastUsedAt: string }>();
    for (const row of (data ?? []) as {
      supplier: string;
      occurred_at: string;
    }[]) {
      const key = normalizeSupplierKey(row.supplier);
      const existing = byKey.get(key);
      if (!existing) {
        // primeira ocorrência na ordenação ASC = forma canônica (R-SUGG-02)
        byKey.set(key, {
          canonical: row.supplier,
          lastUsedAt: row.occurred_at,
        });
      } else if (row.occurred_at > existing.lastUsedAt) {
        existing.lastUsedAt = row.occurred_at;
      }
    }

    const limit =
      normalizedQuery === ""
        ? SUPPLIER_SUGGESTION_LIMIT_EMPTY_QUERY
        : SUPPLIER_SUGGESTION_LIMIT;

    return Array.from(byKey.entries())
      .filter(
        ([key]) => normalizedQuery === "" || key.includes(normalizedQuery),
      )
      .sort((a, b) => (a[1].lastUsedAt < b[1].lastUsedAt ? 1 : -1))
      .slice(0, limit)
      .map(([, value]) => ({
        supplier: value.canonical,
        source: "personal" as const,
      }));
  }

  /**
   * @spec SPEC-20260814-003 RF-03, RNF-02
   * Bypassa RLS via `SUPABASE_ADMIN_CLIENT` deliberadamente — sugestões de workspace exigem ler
   * despesas de outros membros, que a RLS `expenses_select_own` nunca permitiria via client
   * user-scoped (mesmo padrão de `WorkspaceAdminSupabaseService`). A posse do `workspaceId` é
   * validada ANTES via RLS `workspace_members_self_select` (só enxerga a própria linha).
   */
  private async findWorkspaceSupplierSuggestions(
    accessToken: string,
    userId: string,
    workspaceId: string,
    normalizedQuery: string,
  ): Promise<SupplierSuggestion[]> {
    const { data: membership } = await this.clientForUser(accessToken)
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .is("removed_at", null)
      .maybeSingle();

    if (!membership) {
      return [];
    }

    const { data: members, error: membersError } = await this.supabaseAdmin
      .from("workspace_members")
      .select("user_id, profiles(name)")
      .eq("workspace_id", workspaceId)
      .is("removed_at", null);

    if (membersError || !members || members.length === 0) {
      return [];
    }

    const nameByUserId = new Map<string, string | null>();
    const userIds: string[] = [];
    for (const row of members as unknown as {
      user_id: string;
      profiles: { name: string } | { name: string }[] | null;
    }[]) {
      const profile = Array.isArray(row.profiles)
        ? row.profiles[0]
        : row.profiles;
      nameByUserId.set(row.user_id, profile?.name ?? null);
      userIds.push(row.user_id);
    }

    const { data: rows, error: rowsError } = await this.supabaseAdmin
      .from("expenses")
      .select("user_id, supplier, occurred_at")
      .in("user_id", userIds)
      .eq("category", "fuel")
      .not("supplier", "is", null)
      .is("deleted_at", null)
      .order("occurred_at", { ascending: false })
      .limit(SUPPLIER_HISTORY_ROW_LIMIT);

    if (rowsError) {
      this.logger.error(
        "Falha ao listar fornecedores do workspace",
        rowsError.message,
      );
      return [];
    }

    const byKey = new Map<
      string,
      {
        canonical: string;
        canonicalAt: string;
        occurrenceCount: number;
        userIds: Set<string>;
        mostRecentUserId: string;
      }
    >();
    for (const row of (rows ?? []) as {
      user_id: string;
      supplier: string;
      occurred_at: string;
    }[]) {
      const key = normalizeSupplierKey(row.supplier);
      const existing = byKey.get(key);
      if (!existing) {
        // ordenação DESC: primeira ocorrência da chave = uso mais recente
        byKey.set(key, {
          canonical: row.supplier,
          canonicalAt: row.occurred_at,
          occurrenceCount: 1,
          userIds: new Set([row.user_id]),
          mostRecentUserId: row.user_id,
        });
      } else {
        existing.occurrenceCount += 1;
        existing.userIds.add(row.user_id);
        if (row.occurred_at < existing.canonicalAt) {
          // forma canônica = primeira ocorrência cronológica (R-SUGG-02)
          existing.canonical = row.supplier;
          existing.canonicalAt = row.occurred_at;
        }
      }
    }

    return Array.from(byKey.entries())
      .filter(
        ([key]) => normalizedQuery === "" || key.includes(normalizedQuery),
      )
      .sort((a, b) => b[1].occurrenceCount - a[1].occurrenceCount)
      .slice(0, WORKSPACE_SUPPLIER_LIMIT)
      .map(([, value]) => ({
        supplier: value.canonical,
        source: "workspace" as const,
        used_by_count: value.userIds.size,
        most_recent_user_name: nameByUserId.get(value.mostRecentUserId) ?? null,
      }));
  }

  /**
   * @spec SPEC-20260814-003 RF-01, RF-04, RF-05, RF-07, RF-08, RF-10, RNF-01, RNF-02
   * Fire-and-forget (RF-10): qualquer falha nas buscas individuais já retorna lista vazia
   * (tratada dentro de cada helper) — o campo de fornecedor nunca fica bloqueado.
   */
  async getSupplierSuggestions(
    accessToken: string,
    userId: string,
    query?: string,
    workspaceId?: string,
  ): Promise<SupplierSuggestion[]> {
    const normalizedQuery = (query ?? "").trim().normalize("NFC").toLowerCase();

    const personal = await this.findPersonalSupplierSuggestions(
      accessToken,
      userId,
      normalizedQuery,
    );

    const personalKeys = new Set(
      personal.map((item) => normalizeSupplierKey(item.supplier)),
    );

    const workspace = workspaceId
      ? await this.findWorkspaceSupplierSuggestions(
          accessToken,
          userId,
          workspaceId,
          normalizedQuery,
        )
      : [];

    const combined = [
      ...personal,
      ...workspace.filter(
        (item) => !personalKeys.has(normalizeSupplierKey(item.supplier)),
      ),
    ];

    return combined.slice(0, SUPPLIER_SUGGESTION_LIMIT);
  }

  /**
   * @spec SPEC-20260814-002 RF-03, RF-04, RNF-02, RNF-03, R-FUEL-11
   * Mirror histórico de `computeFuelMetrics` (SPEC-20260606-001 R-FUEL-02, R-FUEL-03): nem
   * `price_per_liter` nem `km_per_liter` são colunas persistidas (R-FUEL-03), então a média é
   * recomputada a partir de `amount`/`liters`/`odometer_km` — não há query SQL de agregação
   * direta sobre uma coluna inexistente. `last_odometer_km` também é devolvido aqui (ver doc do
   * tipo `FuelStats` em `@navestory/validators`) para cobrir RF-03 sem introduzir uma 3ª chamada.
   */
  /**
   * @spec SPEC-20260814-002 RF-03, RF-04, RNF-02, RNF-03, R-FUEL-11
   * @spec SPEC-20260807-004 RF-01, RF-05, RNF-03
   * Mirror histórico de `computeFuelMetrics` (SPEC-20260606-001 R-FUEL-02, R-FUEL-03): nem
   * `price_per_liter` nem `km_per_liter` são colunas persistidas (R-FUEL-03), então a média é
   * recomputada a partir de `amount`/`liters`/`odometer_km`. `last_odometer_km` retornado aqui
   * cobre SPEC-20260807-004 RF-01 (MAX de expenses ∪ maintenances) — evita 3ª chamada de rede.
   * `favorite_fuel_type` cobre SPEC-20260807-004 RF-05 — coluna do veículo, já consultado para
   * validação de posse (S1+S2, RNF-03): apenas adiciona o campo ao SELECT.
   */
  async getFuelStats(
    accessToken: string,
    userId: string,
    vehicleId: string,
  ): Promise<FuelStats> {
    const client = this.clientForUser(accessToken);

    // @spec SPEC-20260807-004 RF-05, RNF-03 — favorite_fuel_type adicionado ao SELECT;
    // a validação de posse (user_id eq + deleted_at is null) satisfaz S1+S2.
    const { data: vehicle, error: vehicleError } = await client
      .from("vehicles")
      .select("id, favorite_fuel_type")
      .eq("id", vehicleId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (vehicleError) {
      this.logger.error(
        "Falha ao verificar veículo para estatísticas de combustível",
        vehicleError.message,
      );
      throw new InternalServerErrorException(
        "Não foi possível verificar o veículo",
      );
    }
    if (!vehicle) {
      throw new NotFoundException("Veículo não encontrado");
    }

    const { data, error } = await client
      .from("expenses")
      .select("odometer_km, liters, amount, full_tank, occurred_at")
      .eq("vehicle_id", vehicleId)
      .eq("user_id", userId)
      .eq("category", "fuel")
      .is("deleted_at", null)
      .order("occurred_at", { ascending: true })
      .limit(FUEL_STATS_ROW_LIMIT);

    if (error) {
      this.logger.error(
        "Falha ao calcular estatísticas históricas de combustível",
        error.message,
      );
      throw new InternalServerErrorException(
        "Não foi possível calcular as estatísticas de combustível",
      );
    }

    let prevOdometer: number | null = null;
    let maxOdometerKm: number | null = null;
    const priceSamples: number[] = [];
    const kmSamples: number[] = [];

    for (const row of (data ?? []) as {
      odometer_km: number | null;
      liters: number | null;
      amount: number;
      full_tank: boolean | null;
    }[]) {
      if (row.full_tank === true && row.liters != null && row.liters > 0) {
        priceSamples.push(row.amount / row.liters);
        if (prevOdometer != null && row.odometer_km != null) {
          kmSamples.push((row.odometer_km - prevOdometer) / row.liters);
        }
      }
      if (row.odometer_km != null) {
        prevOdometer = row.odometer_km;
        if (maxOdometerKm == null || row.odometer_km > maxOdometerKm) {
          maxOdometerKm = row.odometer_km;
        }
      }
    }

    // @spec SPEC-20260807-004 RF-01 — ampliar MAX para incluir maintenances (UNION conforme
    // SQL da spec). Desvio intencional de R-ODO-04 já documentado na spec (hint é referência
    // visual, não bloqueio de validação).
    const { data: maintenanceOdos, error: maintenanceError } = await client
      .from("maintenances")
      .select("odometer_km")
      .eq("vehicle_id", vehicleId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .not("odometer_km", "is", null);

    if (!maintenanceError) {
      for (const row of (maintenanceOdos ?? []) as {
        odometer_km: number | null;
      }[]) {
        if (
          row.odometer_km != null &&
          (maxOdometerKm == null || row.odometer_km > maxOdometerKm)
        ) {
          maxOdometerKm = row.odometer_km;
        }
      }
    }
    // Erro em maintenances não lança — o hint é informativo; degradar silenciosamente
    // (fire-and-forget de RF-09) e retornar maxOdometerKm de expenses apenas.

    const recordCount = priceSamples.length;
    const sampleIsSufficient = recordCount >= FUEL_STATS_MIN_RECORDS;

    return {
      avg_price_per_liter: sampleIsSufficient
        ? round2(
            priceSamples.reduce((sum, value) => sum + value, 0) / recordCount,
          )
        : null,
      avg_km_per_liter:
        sampleIsSufficient && kmSamples.length > 0
          ? round1(
              kmSamples.reduce((sum, value) => sum + value, 0) /
                kmSamples.length,
            )
          : null,
      record_count: recordCount,
      last_odometer_km: maxOdometerKm,
      // @spec SPEC-20260807-004 RF-05 — null se coluna não preenchida no veículo
      favorite_fuel_type:
        (vehicle as { id: string; favorite_fuel_type?: string | null })
          .favorite_fuel_type ?? null,
    };
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
      this.logger.error(
        "Falha ao verificar veículo antes de criar despesa",
        vehicleError.message,
      );
      throw new InternalServerErrorException(
        "Não foi possível verificar o veículo",
      );
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
      await this.checkOdometerHardBlock(
        client,
        userId,
        dto.vehicle_id,
        occurredAt,
        dto.odometer_km,
      );
    }

    const { data, error } = await client
      .from("expenses")
      .insert({
        ...dto,
        occurred_at: occurredAt,
        user_id: userId,
        is_readonly: false,
      })
      .select(EXPENSE_COLUMNS)
      .single();

    if (error || !data) {
      this.logger.error("Falha ao criar despesa", error?.message);
      throw new InternalServerErrorException(
        "Não foi possível criar a despesa",
      );
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
      : await this.buildOdometerWarning(
          client,
          userId,
          expense.vehicle_id,
          dto.odometer_km,
        );
    const duplicateWarning = await this.buildDuplicateWarning(
      client,
      userId,
      expense,
      tz,
    );
    const fuelMetrics = await this.computeFuelMetrics(client, userId, expense);
    // @spec SPEC-20260715-002 RF-BK-09, R-TZ-04 — aviso não-bloqueante quando o dia calendário
    // (fuso do usuário) da despesa é posterior ao dia calendário corrente
    const futureDateWarning: Pick<ExpenseWithWarnings, "future_date_warning"> =
      toCalendarDay(new Date(occurredAt), tz) > toCalendarDay(new Date(), tz)
        ? { future_date_warning: true }
        : {};
    return {
      ...expense,
      ...odometerWarning,
      ...duplicateWarning,
      ...fuelMetrics,
      ...futureDateWarning,
    };
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
      throw new InternalServerErrorException(
        "Não foi possível listar as despesas",
      );
    }

    const total = count ?? 0;
    return {
      data: (data ?? []) as Expense[],
      meta: {
        total,
        page,
        limit,
        has_next: from + (data?.length ?? 0) < total,
      },
    };
  }

  /**
   * @spec SPEC-20260714-001 RF-04
   */
  async findOne(
    accessToken: string,
    userId: string,
    expenseId: string,
  ): Promise<Expense> {
    const { data, error } = await this.clientForUser(accessToken)
      .from("expenses")
      .select(EXPENSE_COLUMNS)
      .eq("id", expenseId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      this.logger.error("Falha ao buscar despesa", error.message);
      throw new InternalServerErrorException(
        "Não foi possível buscar a despesa",
      );
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
      throw new ForbiddenException(
        "Despesa vinculada ao ledger não pode ser editada",
      );
    }

    const client = this.clientForUser(accessToken);
    const tz = await this.resolveUserTimezone(accessToken, userId);
    const resolvedOccurredAt =
      dto.occurred_at !== undefined
        ? resolveDateTimeInput(dto.occurred_at, tz)
        : undefined;

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
      .update({
        ...dto,
        ...(resolvedOccurredAt !== undefined
          ? { occurred_at: resolvedOccurredAt }
          : {}),
      })
      .eq("id", expenseId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .select(EXPENSE_COLUMNS)
      .maybeSingle();

    if (error) {
      this.logger.error("Falha ao atualizar despesa", error.message);
      throw new InternalServerErrorException(
        "Não foi possível atualizar a despesa",
      );
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
      : await this.buildOdometerWarning(
          client,
          userId,
          expense.vehicle_id,
          dto.odometer_km,
          expenseId,
        );
    const fuelMetrics = await this.computeFuelMetrics(client, userId, expense);
    return { ...expense, ...warning, ...fuelMetrics };
  }

  /**
   * @spec SPEC-20260714-001 RF-06, RF-07, R-LED-01, R5
   */
  async remove(
    accessToken: string,
    userId: string,
    expenseId: string,
  ): Promise<void> {
    const existing = await this.findOne(accessToken, userId, expenseId);
    if (existing.is_readonly) {
      throw new ForbiddenException(
        "Despesa vinculada ao ledger não pode ser removida",
      );
    }

    const { error } = await this.clientForUser(accessToken)
      .from("expenses")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", expenseId)
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (error) {
      this.logger.error("Falha ao remover despesa", error.message);
      throw new InternalServerErrorException(
        "Não foi possível remover a despesa",
      );
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
    const { data, error } = await (query.limit
      ? builder.limit(query.limit)
      : builder);

    if (error) {
      this.logger.error("Falha ao carregar próximas despesas", error.message);
      throw new InternalServerErrorException(
        "Não foi possível carregar as próximas despesas",
      );
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
      throw new InternalServerErrorException(
        "Não foi possível calcular os KPIs financeiros",
      );
    }
    return round2(
      ((data ?? []) as { amount: number }[]).reduce(
        (sum, row) => sum + row.amount,
        0,
      ),
    );
  }

  /**
   * @spec SPEC-20260608-002 RF-01, RF-02, RF-03
   * @spec SPEC-20260715-002 R-TZ-01 — limites de mês calculados no fuso do usuário, não no
   * calendário local do processo Node.js (mesma classe de bug corrigida em `DashboardService`).
   */
  async getKpis(
    accessToken: string,
    userId: string,
    query: ExpenseKpisDto,
  ): Promise<ExpenseKpis> {
    const client = this.clientForUser(accessToken);
    const tz = await this.resolveUserTimezone(accessToken, userId);
    const todayInTz = toCalendarDay(new Date(), tz);
    const [year, month] = todayInTz.split("-").map(Number) as [number, number];
    const monthStart = (offset: number) => {
      const d = new Date(Date.UTC(year, month - 1 + offset, 1));
      return resolveDateTimeInput(
        `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`,
        tz,
      );
    };
    const startOfThisMonth = monthStart(0);
    const startOfNextMonth = monthStart(1);
    const startOfPrevMonth = monthStart(-1);

    const [totalThisMonth, totalPrevMonth, totalAllTime, upcoming] =
      await Promise.all([
        this.sumExpensesAmount(
          client,
          userId,
          query.vehicle_id,
          startOfThisMonth,
          startOfNextMonth,
        ),
        this.sumExpensesAmount(
          client,
          userId,
          query.vehicle_id,
          startOfPrevMonth,
          startOfThisMonth,
        ),
        this.sumExpensesAmount(client, userId, query.vehicle_id),
        this.getUpcomingCosts(accessToken, {
          vehicle_id: query.vehicle_id,
          horizon_days: 30,
        }),
      ]);

    const deltaPercent =
      totalPrevMonth === 0
        ? null
        : Math.round(
            ((totalThisMonth - totalPrevMonth) / totalPrevMonth) * 1000,
          ) / 10;

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
      throw new InternalServerErrorException(
        "Não foi possível vincular a despesa ao ledger",
      );
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
      throw new InternalServerErrorException(
        "Não foi possível remover a despesa vinculada",
      );
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
    const from =
      query.from ??
      toDateString(
        new Date(today.getFullYear(), today.getMonth() - 12, today.getDate()),
      );
    const to = query.to ?? toDateString(today);

    let builder = client
      .from("expenses")
      .select(
        "occurred_at, amount, category, description, source_type, vehicles(plate, make, model)",
      )
      .eq("user_id", userId)
      .is("deleted_at", null)
      .gte("occurred_at", from)
      .lt("occurred_at", exclusiveDayUpperBoundUtc(to));

    if (query.vehicle_id) {
      builder = builder.eq("vehicle_id", query.vehicle_id);
    }

    const header = "Data,Veiculo,Placa,Categoria,Valor,Origem,Descricao";
    const { data, error } = await builder
      .order("occurred_at", { ascending: false })
      .limit(5_000);

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
      const vehicle = (Array.isArray(row.vehicles)
        ? row.vehicles[0]
        : row.vehicles) ?? {
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

  /**
   * @spec SPEC-20260814-004 RF-03, RF-04, RF-05, RF-07, RF-09, RF-10, R-RCP-01, R-RCP-02,
   * R-RCP-03, R-SAN-05
   * Decisão de implementação (2026-08-14, Douglas): upload é SÍNCRONO (salva
   * `receipt_storage_key`/`receipt_uploaded_at` e retorna antes de responder), thumbnail é
   * ASSÍNCRONO (fire-and-forget, `generateReceiptThumbnail` abaixo) — enquanto não estiver
   * pronto, `receipt_thumbnail_status = 'pending'` e a UI mostra fallback (RNF-02 original da
   * spec previa isso só como caso de exceção ">5s"; a decisão do usuário generaliza esse
   * comportamento para todo upload de imagem).
   */
  async uploadReceipt(
    accessToken: string,
    userId: string,
    expenseId: string,
    file: { buffer: Buffer; mimetype: string; size: number },
  ): Promise<Expense> {
    // valida ownership + existência (também recusa despesa soft-deletada, R5)
    await this.findOne(accessToken, userId, expenseId);

    // revalidação no servidor (R-SAN-05) — nunca confia só no fileFilter do multer/controller
    if (!RECEIPT_ALLOWED_MIME_TYPES.includes(file.mimetype as ReceiptMimeType)) {
      throw new BadRequestException(
        "Tipo de arquivo não suportado. Use JPEG, PNG, WebP ou PDF.",
      );
    }
    if (file.size > RECEIPT_MAX_SIZE_BYTES) {
      throw new BadRequestException("Arquivo muito grande (máx. 10MB).");
    }

    const client = this.clientForUser(accessToken);
    const mime = file.mimetype as ReceiptMimeType;
    const isPdf = mime === "application/pdf";
    // @spec SPEC-20260814-004 RF-03, R-RCP-02 — UUID gerado no servidor, extensão do MIME validado
    const uuid = randomUUID();
    // eslint-disable-next-line security/detect-object-injection -- mime já validado contra RECEIPT_ALLOWED_MIME_TYPES acima, não é input externo livre
    const storageKey = `${userId}/${uuid}.${RECEIPT_MIME_EXTENSION[mime]}`;

    const { error: uploadError } = await client.storage
      .from(RECEIPTS_BUCKET)
      .upload(storageKey, file.buffer, { contentType: mime, upsert: false });
    if (uploadError) {
      this.logger.error(
        "Falha ao enviar comprovante para o storage",
        uploadError.message,
      );
      throw new InternalServerErrorException(
        "Não foi possível enviar o comprovante",
      );
    }

    const { data, error } = await client
      .from("expenses")
      .update({
        receipt_storage_key: storageKey,
        receipt_uploaded_at: new Date().toISOString(),
        // @spec SPEC-20260814-004 RF-05 — PDF nunca gera thumbnail (not_applicable definitivo)
        receipt_thumbnail_status: isPdf ? "not_applicable" : "pending",
      })
      .eq("id", expenseId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .select(EXPENSE_COLUMNS)
      .maybeSingle();

    if (error || !data) {
      this.logger.error(
        "Falha ao vincular comprovante à despesa",
        error?.message,
      );
      throw new InternalServerErrorException(
        "Não foi possível vincular o comprovante à despesa",
      );
    }

    // @spec SPEC-20260814-004 RF-07, R-RCP-03, R-MON-01, R-MON-02 — fire-and-forget, sem
    // storage_key completo (PII de path) no campo `changes`
    void this.auditService.log({
      userId,
      action: "RECEIPT_UPLOADED",
      tableName: "expenses",
      recordId: expenseId,
      changes: { mime_type: mime, size_bytes: file.size },
    });

    if (!isPdf) {
      // fire-and-forget: nunca bloqueia a resposta do upload (decisão de thumbnail assíncrono)
      void this.generateReceiptThumbnail(
        accessToken,
        userId,
        expenseId,
        storageKey,
        file.buffer,
      );
    }

    return data as Expense;
  }

  /**
   * @spec SPEC-20260814-004 RF-05, RF-06, R-RCP-05, R-RCP-06
   * Roda inteiramente fora do ciclo de resposta de `uploadReceipt` (fire-and-forget). Nunca
   * propaga exceção — falha vira `receipt_thumbnail_status = 'failed'` e log de erro, mesmo
   * princípio de `AuditService.log` (R-MON-01).
   */
  private async generateReceiptThumbnail(
    accessToken: string,
    userId: string,
    expenseId: string,
    storageKey: string,
    buffer: Buffer,
  ): Promise<void> {
    const client = this.clientForUser(accessToken);
    try {
      const thumbnailBuffer = await sharp(buffer)
        .resize(RECEIPT_THUMBNAIL_MAX_DIMENSION, RECEIPT_THUMBNAIL_MAX_DIMENSION, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: RECEIPT_THUMBNAIL_JPEG_QUALITY })
        .toBuffer();

      // mesmo UUID do arquivo original (extraído do storageKey) para correlação — sem gerar um
      // segundo identificador desnecessário
      const originalFilename = storageKey.split("/").pop() ?? storageKey;
      const uuidPart = originalFilename.replace(/\.[^.]+$/, "");
      const thumbnailKey = `${userId}/thumb_${uuidPart}.jpg`;

      const { error: uploadError } = await client.storage
        .from(RECEIPTS_BUCKET)
        .upload(thumbnailKey, thumbnailBuffer, {
          contentType: "image/jpeg",
          upsert: false,
        });
      if (uploadError) throw new Error(uploadError.message);

      const { error } = await client
        .from("expenses")
        .update({
          receipt_thumbnail_key: thumbnailKey,
          receipt_thumbnail_status: "completed",
        })
        .eq("id", expenseId)
        .eq("user_id", userId)
        .is("deleted_at", null);
      if (error) throw new Error(error.message);
    } catch (err) {
      this.logger.error(
        "Falha ao gerar thumbnail de comprovante",
        (err as Error).message,
      );
      const { error } = await client
        .from("expenses")
        .update({ receipt_thumbnail_status: "failed" })
        .eq("id", expenseId)
        .eq("user_id", userId)
        .is("deleted_at", null);
      if (error) {
        this.logger.error(
          "Falha ao marcar thumbnail como failed",
          error.message,
        );
      }
    }
  }

  /**
   * @spec SPEC-20260814-004 RF-07, RNF-03, R-RCP-03, R-RCP-06
   * Signed URLs geradas sob demanda (nunca persistidas) — TTL 60min.
   */
  async getReceiptUrls(
    accessToken: string,
    userId: string,
    expenseId: string,
  ): Promise<ReceiptUrls> {
    const expense = await this.findOne(accessToken, userId, expenseId);
    if (!expense.receipt_storage_key) {
      throw new NotFoundException("Despesa não possui comprovante anexado");
    }

    const client = this.clientForUser(accessToken);
    const { data: originalSigned, error: originalError } = await client.storage
      .from(RECEIPTS_BUCKET)
      .createSignedUrl(
        expense.receipt_storage_key,
        RECEIPT_SIGNED_URL_TTL_SECONDS,
      );
    if (originalError || !originalSigned) {
      this.logger.error(
        "Falha ao gerar signed URL do comprovante",
        originalError?.message,
      );
      throw new InternalServerErrorException(
        "Não foi possível gerar o link do comprovante",
      );
    }

    let thumbnailUrl: string | null = null;
    if (expense.receipt_thumbnail_key) {
      const { data: thumbSigned } = await client.storage
        .from(RECEIPTS_BUCKET)
        .createSignedUrl(
          expense.receipt_thumbnail_key,
          RECEIPT_SIGNED_URL_TTL_SECONDS,
        );
      thumbnailUrl = thumbSigned?.signedUrl ?? null;
    }

    // @spec SPEC-20260814-004 RF-07, R-RCP-03, R-MON-01, R-MON-02 — fire-and-forget
    void this.auditService.log({
      userId,
      action: "RECEIPT_ACCESSED",
      tableName: "expenses",
      recordId: expenseId,
    });

    return {
      original_url: originalSigned.signedUrl,
      thumbnail_url: thumbnailUrl,
      thumbnail_status: expense.receipt_thumbnail_status,
      is_pdf: expense.receipt_storage_key.endsWith(".pdf"),
    };
  }
}
